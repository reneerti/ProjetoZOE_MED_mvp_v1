-- =============================================
-- Procedure: sp_MaintenanceAllDatabases
-- Descrição: Manutenção de índices e estatísticas
--            em todos os bancos da instância
-- Uso: Job agendado (ex: todo sábado)
-- SQL Server 2019+
-- =============================================

USE [master]
GO

-- =============================================
-- CRIAR TABELAS DE LOG
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[MaintenanceExecutionLog]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[MaintenanceExecutionLog] (
        ExecutionID uniqueidentifier PRIMARY KEY,
        StartTime datetime2 NOT NULL,
        EndTime datetime2 NULL,
        ServerName nvarchar(128),
        TotalDatabases int,
        DatabasesProcessed int,
        TotalIndexesProcessed int,
        TotalRebuild int,
        TotalReorganize int,
        TotalStatisticsUpdated int,
        TotalErrors int,
        DurationSeconds int,
        Status nvarchar(20)
    );

    CREATE INDEX IX_MaintenanceExecutionLog_StartTime ON [dbo].[MaintenanceExecutionLog](StartTime);
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[MaintenanceDetailLog]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[MaintenanceDetailLog] (
        LogID bigint IDENTITY(1,1) PRIMARY KEY,
        ExecutionID uniqueidentifier NOT NULL,
        LogTime datetime2 DEFAULT GETDATE(),
        DatabaseName nvarchar(128),
        Operation nvarchar(50),
        SchemaName nvarchar(128),
        ObjectName nvarchar(128),
        IndexName nvarchar(128),
        FragmentationBefore decimal(5,2),
        PageCount bigint,
        DurationMs int,
        ErrorMessage nvarchar(max),
        Status nvarchar(20)
    );

    CREATE INDEX IX_MaintenanceDetailLog_ExecutionID ON [dbo].[MaintenanceDetailLog](ExecutionID);
    CREATE INDEX IX_MaintenanceDetailLog_LogTime ON [dbo].[MaintenanceDetailLog](LogTime);
    CREATE INDEX IX_MaintenanceDetailLog_DatabaseName ON [dbo].[MaintenanceDetailLog](DatabaseName);
    CREATE INDEX IX_MaintenanceDetailLog_Status ON [dbo].[MaintenanceDetailLog](Status);
END
GO

-- =============================================
-- CRIAR PROCEDURE
-- =============================================
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_MaintenanceAllDatabases]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_MaintenanceAllDatabases]
GO

CREATE PROCEDURE [dbo].[sp_MaintenanceAllDatabases]
    @FragmentationThreshold decimal(5,2) = 30.0,
    @ReorganizeThreshold decimal(5,2) = 10.0,
    @OnlineRebuild bit = 1,
    @FillFactor int = 90,
    @MinPageCount int = 100,
    @ExcludeDatabases nvarchar(max) = NULL,
    @IncludeOnlyDatabases nvarchar(max) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ExecutionID uniqueidentifier = NEWID();
    DECLARE @MainStartTime datetime2 = GETDATE();
    DECLARE @DatabaseName nvarchar(128);
    DECLARE @SQL nvarchar(max);
    DECLARE @TotalDatabases int = 0;
    DECLARE @ProcessedDatabases int = 0;
    DECLARE @TotalIndexesProcessed int = 0;
    DECLARE @TotalRebuild int = 0;
    DECLARE @TotalReorganize int = 0;
    DECLARE @TotalTablesProcessed int = 0;
    DECLARE @ErrorCount int = 0;

    -- Registrar início da execução
    INSERT INTO [dbo].[MaintenanceExecutionLog] (ExecutionID, StartTime, ServerName, Status)
    VALUES (@ExecutionID, @MainStartTime, @@SERVERNAME, 'RUNNING');

    -- Tabelas temporárias
    CREATE TABLE #DatabasesToProcess (ID int IDENTITY(1,1), DatabaseName nvarchar(128));
    CREATE TABLE #ExcludedDatabases (DatabaseName nvarchar(128));
    CREATE TABLE #IncludedDatabases (DatabaseName nvarchar(128));

    -- Parsear exclusões
    IF @ExcludeDatabases IS NOT NULL
        INSERT INTO #ExcludedDatabases SELECT LTRIM(RTRIM(value)) FROM STRING_SPLIT(@ExcludeDatabases, ',') WHERE LTRIM(RTRIM(value)) <> '';

    IF @IncludeOnlyDatabases IS NOT NULL
        INSERT INTO #IncludedDatabases SELECT LTRIM(RTRIM(value)) FROM STRING_SPLIT(@IncludeOnlyDatabases, ',') WHERE LTRIM(RTRIM(value)) <> '';

    -- Identificar bancos
    INSERT INTO #DatabasesToProcess (DatabaseName)
    SELECT d.name
    FROM sys.databases d
    WHERE d.state_desc = 'ONLINE'
      AND d.is_read_only = 0
      AND d.name NOT IN ('master', 'model', 'msdb', 'tempdb')
      AND d.name NOT IN (SELECT DatabaseName FROM #ExcludedDatabases)
      AND (@IncludeOnlyDatabases IS NULL OR d.name IN (SELECT DatabaseName FROM #IncludedDatabases))
    ORDER BY d.name;

    SET @TotalDatabases = (SELECT COUNT(*) FROM #DatabasesToProcess);

    -- Loop pelos bancos
    DECLARE db_cursor CURSOR FOR SELECT DatabaseName FROM #DatabasesToProcess ORDER BY DatabaseName;
    OPEN db_cursor;
    FETCH NEXT FROM db_cursor INTO @DatabaseName;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @ProcessedDatabases = @ProcessedDatabases + 1;

        BEGIN TRY
            -- =============================================
            -- FASE 1: ÍNDICES
            -- =============================================
            IF OBJECT_ID('tempdb..#IndexesToProcess') IS NOT NULL DROP TABLE #IndexesToProcess;

            CREATE TABLE #IndexesToProcess (
                ID int IDENTITY(1,1),
                SchemaName nvarchar(128),
                TableName nvarchar(128),
                IndexName nvarchar(128),
                FragmentationPercent decimal(5,2),
                PageCount bigint,
                ActionType nvarchar(20)
            );

            SET @SQL = N'
            USE [' + @DatabaseName + '];
            INSERT INTO #IndexesToProcess (SchemaName, TableName, IndexName, FragmentationPercent, PageCount, ActionType)
            SELECT s.name, t.name, i.name,
                   ROUND(ips.avg_fragmentation_in_percent, 2),
                   ips.page_count,
                   CASE WHEN ips.avg_fragmentation_in_percent >= ' + CAST(@FragmentationThreshold as varchar(10)) + ' THEN ''REBUILD''
                        WHEN ips.avg_fragmentation_in_percent >= ' + CAST(@ReorganizeThreshold as varchar(10)) + ' THEN ''REORGANIZE'' END
            FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, ''LIMITED'') ips
            INNER JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
            INNER JOIN sys.tables t ON i.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE ips.avg_fragmentation_in_percent >= ' + CAST(@ReorganizeThreshold as varchar(10)) + '
              AND ips.page_count > ' + CAST(@MinPageCount as varchar(10)) + '
              AND i.is_disabled = 0 AND i.is_hypothetical = 0 AND i.name IS NOT NULL
              AND ips.alloc_unit_type_desc = ''IN_ROW_DATA'' AND t.is_ms_shipped = 0;';

            EXEC sp_executesql @SQL;

            -- Processar índices
            DECLARE @Schema nvarchar(128), @Table nvarchar(128), @Index nvarchar(128);
            DECLARE @Fragmentation decimal(5,2), @Action nvarchar(20), @Pages bigint;
            DECLARE @OpStartTime datetime2;

            DECLARE index_cursor CURSOR FOR
            SELECT SchemaName, TableName, IndexName, FragmentationPercent, ActionType, PageCount
            FROM #IndexesToProcess ORDER BY FragmentationPercent DESC;

            OPEN index_cursor;
            FETCH NEXT FROM index_cursor INTO @Schema, @Table, @Index, @Fragmentation, @Action, @Pages;

            WHILE @@FETCH_STATUS = 0
            BEGIN
                SET @OpStartTime = GETDATE();

                BEGIN TRY
                    IF @Action = 'REBUILD'
                    BEGIN
                        SET @SQL = 'USE [' + @DatabaseName + ']; ALTER INDEX [' + @Index + '] ON [' + @Schema + '].[' + @Table + '] REBUILD WITH (';
                        IF @OnlineRebuild = 1 AND SERVERPROPERTY('EngineEdition') IN (3, 4)
                            SET @SQL = @SQL + 'ONLINE = ON, ';
                        SET @SQL = @SQL + 'FILLFACTOR = ' + CAST(@FillFactor as varchar(3)) + ', SORT_IN_TEMPDB = ON);';
                        SET @TotalRebuild = @TotalRebuild + 1;
                    END
                    ELSE
                    BEGIN
                        SET @SQL = 'USE [' + @DatabaseName + ']; ALTER INDEX [' + @Index + '] ON [' + @Schema + '].[' + @Table + '] REORGANIZE;';
                        SET @TotalReorganize = @TotalReorganize + 1;
                    END

                    EXEC sp_executesql @SQL;
                    SET @TotalIndexesProcessed = @TotalIndexesProcessed + 1;

                    INSERT INTO [dbo].[MaintenanceDetailLog] (ExecutionID, DatabaseName, Operation, SchemaName, ObjectName, IndexName, FragmentationBefore, PageCount, DurationMs, Status)
                    VALUES (@ExecutionID, @DatabaseName, @Action, @Schema, @Table, @Index, @Fragmentation, @Pages, DATEDIFF(MILLISECOND, @OpStartTime, GETDATE()), 'SUCCESS');

                END TRY
                BEGIN CATCH
                    SET @ErrorCount = @ErrorCount + 1;
                    INSERT INTO [dbo].[MaintenanceDetailLog] (ExecutionID, DatabaseName, Operation, SchemaName, ObjectName, IndexName, FragmentationBefore, PageCount, DurationMs, ErrorMessage, Status)
                    VALUES (@ExecutionID, @DatabaseName, @Action, @Schema, @Table, @Index, @Fragmentation, @Pages, DATEDIFF(MILLISECOND, @OpStartTime, GETDATE()), ERROR_MESSAGE(), 'ERROR');
                END CATCH

                FETCH NEXT FROM index_cursor INTO @Schema, @Table, @Index, @Fragmentation, @Action, @Pages;
            END

            CLOSE index_cursor;
            DEALLOCATE index_cursor;

            -- =============================================
            -- FASE 2: ESTATÍSTICAS
            -- =============================================
            IF OBJECT_ID('tempdb..#TablesToUpdate') IS NOT NULL DROP TABLE #TablesToUpdate;

            CREATE TABLE #TablesToUpdate (ID int IDENTITY(1,1), SchemaName nvarchar(128), TableName nvarchar(128));

            SET @SQL = N'
            USE [' + @DatabaseName + '];
            INSERT INTO #TablesToUpdate (SchemaName, TableName)
            SELECT s.name, t.name
            FROM sys.tables t
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE t.is_ms_shipped = 0 AND t.type = ''U'';';

            EXEC sp_executesql @SQL;

            DECLARE @SchemaName nvarchar(128), @TblName nvarchar(128);

            DECLARE stats_cursor CURSOR FOR SELECT SchemaName, TableName FROM #TablesToUpdate;
            OPEN stats_cursor;
            FETCH NEXT FROM stats_cursor INTO @SchemaName, @TblName;

            WHILE @@FETCH_STATUS = 0
            BEGIN
                SET @OpStartTime = GETDATE();

                BEGIN TRY
                    SET @SQL = 'USE [' + @DatabaseName + ']; UPDATE STATISTICS [' + @SchemaName + '].[' + @TblName + '] WITH FULLSCAN;';
                    EXEC sp_executesql @SQL;
                    SET @TotalTablesProcessed = @TotalTablesProcessed + 1;

                    INSERT INTO [dbo].[MaintenanceDetailLog] (ExecutionID, DatabaseName, Operation, SchemaName, ObjectName, DurationMs, Status)
                    VALUES (@ExecutionID, @DatabaseName, 'UPDATE_STATISTICS', @SchemaName, @TblName, DATEDIFF(MILLISECOND, @OpStartTime, GETDATE()), 'SUCCESS');

                END TRY
                BEGIN CATCH
                    SET @ErrorCount = @ErrorCount + 1;
                    INSERT INTO [dbo].[MaintenanceDetailLog] (ExecutionID, DatabaseName, Operation, SchemaName, ObjectName, DurationMs, ErrorMessage, Status)
                    VALUES (@ExecutionID, @DatabaseName, 'UPDATE_STATISTICS', @SchemaName, @TblName, DATEDIFF(MILLISECOND, @OpStartTime, GETDATE()), ERROR_MESSAGE(), 'ERROR');
                END CATCH

                FETCH NEXT FROM stats_cursor INTO @SchemaName, @TblName;
            END

            CLOSE stats_cursor;
            DEALLOCATE stats_cursor;

        END TRY
        BEGIN CATCH
            SET @ErrorCount = @ErrorCount + 1;
            INSERT INTO [dbo].[MaintenanceDetailLog] (ExecutionID, DatabaseName, Operation, ErrorMessage, Status)
            VALUES (@ExecutionID, @DatabaseName, 'DATABASE_ERROR', ERROR_MESSAGE(), 'ERROR');
        END CATCH

        FETCH NEXT FROM db_cursor INTO @DatabaseName;
    END

    CLOSE db_cursor;
    DEALLOCATE db_cursor;

    -- Atualizar registro de execução
    UPDATE [dbo].[MaintenanceExecutionLog]
    SET EndTime = GETDATE(),
        TotalDatabases = @TotalDatabases,
        DatabasesProcessed = @ProcessedDatabases,
        TotalIndexesProcessed = @TotalIndexesProcessed,
        TotalRebuild = @TotalRebuild,
        TotalReorganize = @TotalReorganize,
        TotalStatisticsUpdated = @TotalTablesProcessed,
        TotalErrors = @ErrorCount,
        DurationSeconds = DATEDIFF(SECOND, @MainStartTime, GETDATE()),
        Status = CASE WHEN @ErrorCount > 0 THEN 'COMPLETED_WITH_ERRORS' ELSE 'SUCCESS' END
    WHERE ExecutionID = @ExecutionID;

    -- Limpeza
    DROP TABLE #DatabasesToProcess;
    DROP TABLE #ExcludedDatabases;
    DROP TABLE #IncludedDatabases;
END
GO

-- =============================================
-- VIEWS PARA ANÁLISE
-- =============================================

-- View: Resumo das execuções
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_MaintenanceExecutionSummary')
    DROP VIEW vw_MaintenanceExecutionSummary;
GO

CREATE VIEW vw_MaintenanceExecutionSummary AS
SELECT
    ExecutionID,
    StartTime,
    EndTime,
    ServerName,
    TotalDatabases,
    DatabasesProcessed,
    TotalIndexesProcessed,
    TotalRebuild,
    TotalReorganize,
    TotalStatisticsUpdated,
    TotalErrors,
    DurationSeconds,
    DurationSeconds / 60 as DurationMinutes,
    Status,
    DATENAME(WEEKDAY, StartTime) as DiaSemana
FROM MaintenanceExecutionLog;
GO

-- View: Erros para análise
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_MaintenanceErrors')
    DROP VIEW vw_MaintenanceErrors;
GO

CREATE VIEW vw_MaintenanceErrors AS
SELECT
    d.ExecutionID,
    e.StartTime as ExecutionStartTime,
    d.LogTime,
    d.DatabaseName,
    d.Operation,
    d.SchemaName + '.' + ISNULL(d.ObjectName, '') + ISNULL('.' + d.IndexName, '') as FullObjectName,
    d.ErrorMessage
FROM MaintenanceDetailLog d
INNER JOIN MaintenanceExecutionLog e ON d.ExecutionID = e.ExecutionID
WHERE d.Status = 'ERROR';
GO

-- View: Índices mais fragmentados (histórico)
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_MaintenanceIndexHistory')
    DROP VIEW vw_MaintenanceIndexHistory;
GO

CREATE VIEW vw_MaintenanceIndexHistory AS
SELECT
    d.ExecutionID,
    e.StartTime as ExecutionDate,
    d.DatabaseName,
    d.SchemaName + '.' + d.ObjectName + '.' + d.IndexName as FullIndexName,
    d.Operation,
    d.FragmentationBefore,
    d.PageCount,
    d.DurationMs,
    d.Status
FROM MaintenanceDetailLog d
INNER JOIN MaintenanceExecutionLog e ON d.ExecutionID = e.ExecutionID
WHERE d.Operation IN ('REBUILD', 'REORGANIZE');
GO
