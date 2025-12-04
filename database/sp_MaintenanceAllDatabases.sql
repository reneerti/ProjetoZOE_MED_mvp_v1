-- =============================================
-- Procedure: sp_MaintenanceAllDatabases
-- Descrição: Executa manutenção de índices e
--            estatísticas em todos os bancos da instância
-- SQL Server 2019+
-- Autor: Gerado automaticamente
-- Data: 2025-12-04
-- =============================================

USE [master]
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_MaintenanceAllDatabases]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_MaintenanceAllDatabases]
GO

CREATE PROCEDURE [dbo].[sp_MaintenanceAllDatabases]
    -- Parâmetros de configuração
    @FragmentationThreshold decimal(5,2) = 30.0,      -- Rebuild se >= 30%
    @ReorganizeThreshold decimal(5,2) = 10.0,         -- Reorganize se >= 10%
    @OnlineRebuild bit = 1,                           -- Tentar rebuild online
    @FillFactor int = 90,                             -- Fill factor padrão
    @MinPageCount int = 100,                          -- Mínimo de páginas para considerar
    @ExcludeDatabases nvarchar(max) = NULL,           -- Bancos a excluir (separados por vírgula)
    @IncludeOnlyDatabases nvarchar(max) = NULL,       -- Processar apenas estes bancos (separados por vírgula)
    @LogToTable bit = 1,                              -- Logar execução em tabela
    @Debug bit = 0                                    -- Modo debug (apenas mostra comandos)
AS
BEGIN
    SET NOCOUNT ON;

    -- =========================================
    -- DECLARAÇÃO DE VARIÁVEIS GERAIS
    -- =========================================
    DECLARE @DatabaseName nvarchar(128);
    DECLARE @SQL nvarchar(max);
    DECLARE @Message nvarchar(1000);
    DECLARE @MainStartTime datetime2 = GETDATE();
    DECLARE @DatabaseStartTime datetime2;
    DECLARE @TotalDatabases int = 0;
    DECLARE @ProcessedDatabases int = 0;
    DECLARE @TotalIndexesProcessed int = 0;
    DECLARE @TotalTablesProcessed int = 0;
    DECLARE @ErrorCount int = 0;

    -- =========================================
    -- CRIAR TABELA DE LOG SE NECESSÁRIO
    -- =========================================
    IF @LogToTable = 1
    BEGIN
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[MaintenanceLog]') AND type in (N'U'))
        BEGIN
            CREATE TABLE [dbo].[MaintenanceLog] (
                LogID int IDENTITY(1,1) PRIMARY KEY,
                ExecutionID uniqueidentifier NOT NULL,
                LogTime datetime2 DEFAULT GETDATE(),
                DatabaseName nvarchar(128),
                Operation nvarchar(50),
                ObjectName nvarchar(500),
                Details nvarchar(max),
                DurationSeconds int,
                Status nvarchar(20)
            );

            CREATE INDEX IX_MaintenanceLog_ExecutionID ON [dbo].[MaintenanceLog](ExecutionID);
            CREATE INDEX IX_MaintenanceLog_LogTime ON [dbo].[MaintenanceLog](LogTime);
        END
    END

    DECLARE @ExecutionID uniqueidentifier = NEWID();

    -- =========================================
    -- FUNÇÃO PARA LOG
    -- =========================================
    -- Tabela temporária para armazenar logs da sessão
    CREATE TABLE #SessionLog (
        LogID int IDENTITY(1,1),
        LogTime datetime2 DEFAULT GETDATE(),
        DatabaseName nvarchar(128),
        Operation nvarchar(50),
        ObjectName nvarchar(500),
        Details nvarchar(max),
        DurationSeconds int,
        Status nvarchar(20)
    );

    -- =========================================
    -- INÍCIO DO PROCESSO
    -- =========================================
    PRINT '================================================================================';
    PRINT '       MANUTENÇÃO DE ÍNDICES E ESTATÍSTICAS - TODOS OS BANCOS';
    PRINT '================================================================================';
    PRINT 'Execution ID: ' + CAST(@ExecutionID as varchar(50));
    PRINT 'Data/Hora Início: ' + CONVERT(varchar(20), @MainStartTime, 120);
    PRINT 'Servidor: ' + @@SERVERNAME;
    PRINT 'Versão SQL Server: ' + CAST(SERVERPROPERTY('ProductVersion') as varchar(50));
    PRINT '';
    PRINT 'PARÂMETROS:';
    PRINT '  - Threshold Rebuild: ' + CAST(@FragmentationThreshold as varchar(10)) + '%';
    PRINT '  - Threshold Reorganize: ' + CAST(@ReorganizeThreshold as varchar(10)) + '%';
    PRINT '  - Online Rebuild: ' + CASE WHEN @OnlineRebuild = 1 THEN 'Sim' ELSE 'Não' END;
    PRINT '  - Fill Factor: ' + CAST(@FillFactor as varchar(10));
    PRINT '  - Mínimo de Páginas: ' + CAST(@MinPageCount as varchar(10));
    PRINT '================================================================================';
    PRINT '';

    -- Log inicial
    INSERT INTO #SessionLog (DatabaseName, Operation, ObjectName, Details, Status)
    VALUES (NULL, 'INICIO', 'sp_MaintenanceAllDatabases',
            'ExecutionID: ' + CAST(@ExecutionID as varchar(50)), 'SUCCESS');

    -- =========================================
    -- TABELA TEMPORÁRIA COM LISTA DE BANCOS
    -- =========================================
    CREATE TABLE #DatabasesToProcess (
        ID int IDENTITY(1,1),
        DatabaseName nvarchar(128),
        SizeGB decimal(10,2),
        Processed bit DEFAULT 0
    );

    -- Tabela para bancos excluídos (parseados)
    CREATE TABLE #ExcludedDatabases (DatabaseName nvarchar(128));

    -- Tabela para bancos incluídos (parseados)
    CREATE TABLE #IncludedDatabases (DatabaseName nvarchar(128));

    -- Parsear bancos excluídos
    IF @ExcludeDatabases IS NOT NULL
    BEGIN
        INSERT INTO #ExcludedDatabases (DatabaseName)
        SELECT LTRIM(RTRIM(value))
        FROM STRING_SPLIT(@ExcludeDatabases, ',')
        WHERE LTRIM(RTRIM(value)) <> '';
    END

    -- Parsear bancos incluídos
    IF @IncludeOnlyDatabases IS NOT NULL
    BEGIN
        INSERT INTO #IncludedDatabases (DatabaseName)
        SELECT LTRIM(RTRIM(value))
        FROM STRING_SPLIT(@IncludeOnlyDatabases, ',')
        WHERE LTRIM(RTRIM(value)) <> '';
    END

    -- Identificar bancos a processar
    INSERT INTO #DatabasesToProcess (DatabaseName, SizeGB)
    SELECT
        d.name,
        CAST(SUM(mf.size) * 8.0 / 1024 / 1024 as decimal(10,2)) as SizeGB
    FROM sys.databases d
    LEFT JOIN sys.master_files mf ON d.database_id = mf.database_id
    WHERE d.state_desc = 'ONLINE'                              -- Apenas bancos online
      AND d.is_read_only = 0                                   -- Não processar read-only
      AND d.name NOT IN ('master', 'model', 'msdb', 'tempdb')  -- Excluir system databases
      AND d.name NOT IN (SELECT DatabaseName FROM #ExcludedDatabases)
      AND (
            @IncludeOnlyDatabases IS NULL
            OR d.name IN (SELECT DatabaseName FROM #IncludedDatabases)
          )
    GROUP BY d.name
    ORDER BY d.name;

    SET @TotalDatabases = (SELECT COUNT(*) FROM #DatabasesToProcess);

    PRINT 'Bancos de dados a processar: ' + CAST(@TotalDatabases as varchar(10));
    PRINT '';

    -- Listar bancos que serão processados
    PRINT 'Lista de bancos:';
    SELECT @Message = STRING_AGG(DatabaseName + ' (' + CAST(SizeGB as varchar(20)) + ' GB)', ', ')
    FROM #DatabasesToProcess;
    PRINT @Message;
    PRINT '';

    IF @TotalDatabases = 0
    BEGIN
        PRINT 'AVISO: Nenhum banco de dados encontrado para processar.';
        RETURN;
    END

    -- =========================================
    -- CURSOR PRINCIPAL - LOOP PELOS BANCOS
    -- =========================================
    DECLARE db_cursor CURSOR FOR
    SELECT DatabaseName FROM #DatabasesToProcess ORDER BY DatabaseName;

    OPEN db_cursor;
    FETCH NEXT FROM db_cursor INTO @DatabaseName;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @ProcessedDatabases = @ProcessedDatabases + 1;
        SET @DatabaseStartTime = GETDATE();

        PRINT '';
        PRINT '################################################################################';
        PRINT '## BANCO ' + CAST(@ProcessedDatabases as varchar(10)) + '/' + CAST(@TotalDatabases as varchar(10)) + ': ' + @DatabaseName;
        PRINT '## Início: ' + CONVERT(varchar(20), @DatabaseStartTime, 120);
        PRINT '################################################################################';
        PRINT '';

        BEGIN TRY
            -- =============================================
            -- FASE 1: MANUTENÇÃO DE ÍNDICES
            -- =============================================
            PRINT '>>> FASE 1: MANUTENÇÃO DE ÍNDICES <<<';
            PRINT '';

            -- Criar tabela temporária para índices deste banco
            IF OBJECT_ID('tempdb..#IndexesToProcess') IS NOT NULL
                DROP TABLE #IndexesToProcess;

            CREATE TABLE #IndexesToProcess (
                ID int IDENTITY(1,1),
                SchemaName nvarchar(128),
                TableName nvarchar(128),
                IndexName nvarchar(128),
                FragmentationPercent decimal(5,2),
                PageCount bigint,
                ActionType nvarchar(20),
                Processed bit DEFAULT 0
            );

            -- Identificar índices fragmentados neste banco
            SET @SQL = N'
            USE [' + @DatabaseName + '];

            INSERT INTO #IndexesToProcess (SchemaName, TableName, IndexName, FragmentationPercent, PageCount, ActionType)
            SELECT
                s.name as SchemaName,
                t.name as TableName,
                i.name as IndexName,
                ROUND(ips.avg_fragmentation_in_percent, 2) as FragmentationPercent,
                ips.page_count,
                CASE
                    WHEN ips.avg_fragmentation_in_percent >= ' + CAST(@FragmentationThreshold as varchar(10)) + ' THEN ''REBUILD''
                    WHEN ips.avg_fragmentation_in_percent >= ' + CAST(@ReorganizeThreshold as varchar(10)) + ' THEN ''REORGANIZE''
                END as ActionType
            FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, ''LIMITED'') ips
            INNER JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
            INNER JOIN sys.tables t ON i.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE ips.avg_fragmentation_in_percent >= ' + CAST(@ReorganizeThreshold as varchar(10)) + '
              AND ips.page_count > ' + CAST(@MinPageCount as varchar(10)) + '
              AND i.is_disabled = 0
              AND i.is_hypothetical = 0
              AND i.name IS NOT NULL
              AND ips.alloc_unit_type_desc = ''IN_ROW_DATA''
              AND t.is_ms_shipped = 0
            ORDER BY ips.avg_fragmentation_in_percent DESC;';

            IF @Debug = 1
                PRINT @SQL;

            EXEC sp_executesql @SQL;

            -- Mostrar resumo dos índices
            DECLARE @IndexCount int = (SELECT COUNT(*) FROM #IndexesToProcess);
            DECLARE @RebuildCount int = (SELECT COUNT(*) FROM #IndexesToProcess WHERE ActionType = 'REBUILD');
            DECLARE @ReorgCount int = (SELECT COUNT(*) FROM #IndexesToProcess WHERE ActionType = 'REORGANIZE');

            PRINT 'Índices encontrados: ' + CAST(@IndexCount as varchar(10));
            PRINT '  - Para REBUILD: ' + CAST(@RebuildCount as varchar(10));
            PRINT '  - Para REORGANIZE: ' + CAST(@ReorgCount as varchar(10));
            PRINT '';

            -- Processar índices
            IF @IndexCount > 0
            BEGIN
                DECLARE @IndexID int, @Schema nvarchar(128), @Table nvarchar(128), @Index nvarchar(128);
                DECLARE @Fragmentation decimal(5,2), @Action nvarchar(20), @Pages bigint;
                DECLARE @IndexStartTime datetime2;
                DECLARE @IndexesProcessed int = 0;

                DECLARE index_cursor CURSOR FOR
                SELECT ID, SchemaName, TableName, IndexName, FragmentationPercent, ActionType, PageCount
                FROM #IndexesToProcess
                ORDER BY FragmentationPercent DESC;

                OPEN index_cursor;
                FETCH NEXT FROM index_cursor INTO @IndexID, @Schema, @Table, @Index, @Fragmentation, @Action, @Pages;

                WHILE @@FETCH_STATUS = 0
                BEGIN
                    SET @IndexStartTime = GETDATE();

                    BEGIN TRY
                        -- Construir comando SQL
                        IF @Action = 'REBUILD'
                        BEGIN
                            SET @SQL = 'USE [' + @DatabaseName + ']; ALTER INDEX [' + @Index + '] ON [' + @Schema + '].[' + @Table + '] REBUILD WITH (';

                            -- Verificar se pode usar ONLINE
                            IF @OnlineRebuild = 1 AND SERVERPROPERTY('EngineEdition') IN (3, 4)
                                SET @SQL = @SQL + 'ONLINE = ON, ';

                            SET @SQL = @SQL + 'FILLFACTOR = ' + CAST(@FillFactor as varchar(3)) + ', SORT_IN_TEMPDB = ON);';
                        END
                        ELSE IF @Action = 'REORGANIZE'
                        BEGIN
                            SET @SQL = 'USE [' + @DatabaseName + ']; ALTER INDEX [' + @Index + '] ON [' + @Schema + '].[' + @Table + '] REORGANIZE;';
                        END

                        SET @Message = '  ' + @Action + ': [' + @Schema + '].[' + @Table + '].[' + @Index + '] - Frag: ' +
                                      CAST(@Fragmentation as varchar(10)) + '%, Páginas: ' + CAST(@Pages as varchar(20));
                        PRINT @Message;

                        IF @Debug = 0
                            EXEC sp_executesql @SQL;
                        ELSE
                            PRINT '    DEBUG SQL: ' + @SQL;

                        SET @IndexesProcessed = @IndexesProcessed + 1;
                        SET @TotalIndexesProcessed = @TotalIndexesProcessed + 1;

                        -- Log sucesso
                        INSERT INTO #SessionLog (DatabaseName, Operation, ObjectName, Details, DurationSeconds, Status)
                        VALUES (@DatabaseName, @Action, @Schema + '.' + @Table + '.' + @Index,
                                'Fragmentação: ' + CAST(@Fragmentation as varchar(10)) + '%',
                                DATEDIFF(SECOND, @IndexStartTime, GETDATE()), 'SUCCESS');

                    END TRY
                    BEGIN CATCH
                        SET @ErrorCount = @ErrorCount + 1;
                        SET @Message = '  ERRO em [' + @Schema + '].[' + @Table + '].[' + @Index + ']: ' + ERROR_MESSAGE();
                        PRINT @Message;

                        -- Log erro
                        INSERT INTO #SessionLog (DatabaseName, Operation, ObjectName, Details, Status)
                        VALUES (@DatabaseName, @Action, @Schema + '.' + @Table + '.' + @Index,
                                'ERRO: ' + ERROR_MESSAGE(), 'ERROR');
                    END CATCH

                    FETCH NEXT FROM index_cursor INTO @IndexID, @Schema, @Table, @Index, @Fragmentation, @Action, @Pages;
                END

                CLOSE index_cursor;
                DEALLOCATE index_cursor;

                PRINT '';
                PRINT 'Índices processados neste banco: ' + CAST(@IndexesProcessed as varchar(10));
            END
            ELSE
            BEGIN
                PRINT 'Nenhum índice necessita de manutenção neste banco.';
            END

            PRINT '';

            -- =============================================
            -- FASE 2: ATUALIZAÇÃO DE ESTATÍSTICAS
            -- =============================================
            PRINT '>>> FASE 2: ATUALIZAÇÃO DE ESTATÍSTICAS <<<';
            PRINT '';

            -- Criar tabela temporária para estatísticas
            IF OBJECT_ID('tempdb..#TablesToUpdate') IS NOT NULL
                DROP TABLE #TablesToUpdate;

            CREATE TABLE #TablesToUpdate (
                ID int IDENTITY(1,1),
                SchemaName nvarchar(128),
                TableName nvarchar(128),
                FullName nvarchar(500)
            );

            -- Identificar tabelas para atualizar estatísticas
            SET @SQL = N'
            USE [' + @DatabaseName + '];

            INSERT INTO #TablesToUpdate (SchemaName, TableName, FullName)
            SELECT
                s.name as SchemaName,
                t.name as TableName,
                QUOTENAME(s.name) + ''.'' + QUOTENAME(t.name) as FullName
            FROM sys.tables t
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE t.is_ms_shipped = 0
              AND t.type = ''U''
            ORDER BY s.name, t.name;';

            IF @Debug = 1
                PRINT @SQL;

            EXEC sp_executesql @SQL;

            DECLARE @TableCount int = (SELECT COUNT(*) FROM #TablesToUpdate);
            DECLARE @TablesProcessed int = 0;

            PRINT 'Tabelas encontradas: ' + CAST(@TableCount as varchar(10));
            PRINT '';

            -- Processar estatísticas
            IF @TableCount > 0
            BEGIN
                DECLARE @TableID int;
                DECLARE @SchemaName nvarchar(128);
                DECLARE @TblName nvarchar(128);
                DECLARE @FullTableName nvarchar(500);
                DECLARE @StatsStartTime datetime2;

                DECLARE stats_cursor CURSOR FOR
                SELECT ID, SchemaName, TableName, FullName
                FROM #TablesToUpdate
                ORDER BY SchemaName, TableName;

                OPEN stats_cursor;
                FETCH NEXT FROM stats_cursor INTO @TableID, @SchemaName, @TblName, @FullTableName;

                WHILE @@FETCH_STATUS = 0
                BEGIN
                    SET @StatsStartTime = GETDATE();

                    BEGIN TRY
                        SET @SQL = 'USE [' + @DatabaseName + ']; UPDATE STATISTICS ' + @FullTableName + ' WITH FULLSCAN;';

                        PRINT '  UPDATE STATISTICS: ' + @FullTableName;

                        IF @Debug = 0
                            EXEC sp_executesql @SQL;
                        ELSE
                            PRINT '    DEBUG SQL: ' + @SQL;

                        SET @TablesProcessed = @TablesProcessed + 1;
                        SET @TotalTablesProcessed = @TotalTablesProcessed + 1;

                        -- Log sucesso
                        INSERT INTO #SessionLog (DatabaseName, Operation, ObjectName, DurationSeconds, Status)
                        VALUES (@DatabaseName, 'UPDATE_STATS', @FullTableName,
                                DATEDIFF(SECOND, @StatsStartTime, GETDATE()), 'SUCCESS');

                    END TRY
                    BEGIN CATCH
                        SET @ErrorCount = @ErrorCount + 1;
                        PRINT '  ERRO em ' + @FullTableName + ': ' + ERROR_MESSAGE();

                        -- Log erro
                        INSERT INTO #SessionLog (DatabaseName, Operation, ObjectName, Details, Status)
                        VALUES (@DatabaseName, 'UPDATE_STATS', @FullTableName,
                                'ERRO: ' + ERROR_MESSAGE(), 'ERROR');
                    END CATCH

                    FETCH NEXT FROM stats_cursor INTO @TableID, @SchemaName, @TblName, @FullTableName;
                END

                CLOSE stats_cursor;
                DEALLOCATE stats_cursor;

                PRINT '';
                PRINT 'Tabelas com estatísticas atualizadas: ' + CAST(@TablesProcessed as varchar(10));
            END

            -- Resumo do banco
            DECLARE @DatabaseDuration int = DATEDIFF(SECOND, @DatabaseStartTime, GETDATE());

            PRINT '';
            PRINT '--------------------------------------------------------------------------------';
            PRINT 'RESUMO DO BANCO [' + @DatabaseName + ']:';
            PRINT '  - Índices processados: ' + CAST(@IndexesProcessed as varchar(10));
            PRINT '  - Tabelas com estatísticas atualizadas: ' + CAST(@TablesProcessed as varchar(10));
            PRINT '  - Duração: ' + CAST(@DatabaseDuration as varchar(10)) + ' segundos';
            PRINT '--------------------------------------------------------------------------------';

            -- Log conclusão do banco
            INSERT INTO #SessionLog (DatabaseName, Operation, Details, DurationSeconds, Status)
            VALUES (@DatabaseName, 'DATABASE_COMPLETE',
                    'Índices: ' + CAST(@IndexesProcessed as varchar(10)) + ', Tabelas: ' + CAST(@TablesProcessed as varchar(10)),
                    @DatabaseDuration, 'SUCCESS');

            -- Marcar banco como processado
            UPDATE #DatabasesToProcess SET Processed = 1 WHERE DatabaseName = @DatabaseName;

        END TRY
        BEGIN CATCH
            SET @ErrorCount = @ErrorCount + 1;
            PRINT '';
            PRINT '!!! ERRO CRÍTICO no banco [' + @DatabaseName + ']: ' + ERROR_MESSAGE();
            PRINT '';

            -- Log erro crítico
            INSERT INTO #SessionLog (DatabaseName, Operation, Details, Status)
            VALUES (@DatabaseName, 'DATABASE_ERROR', 'ERRO CRÍTICO: ' + ERROR_MESSAGE(), 'ERROR');
        END CATCH

        FETCH NEXT FROM db_cursor INTO @DatabaseName;
    END

    CLOSE db_cursor;
    DEALLOCATE db_cursor;

    -- =========================================
    -- RELATÓRIO FINAL
    -- =========================================
    DECLARE @MainEndTime datetime2 = GETDATE();
    DECLARE @TotalDuration int = DATEDIFF(SECOND, @MainStartTime, @MainEndTime);

    PRINT '';
    PRINT '================================================================================';
    PRINT '                      RELATÓRIO FINAL DA MANUTENÇÃO';
    PRINT '================================================================================';
    PRINT 'Execution ID: ' + CAST(@ExecutionID as varchar(50));
    PRINT '';
    PRINT 'TEMPO:';
    PRINT '  - Início: ' + CONVERT(varchar(20), @MainStartTime, 120);
    PRINT '  - Fim: ' + CONVERT(varchar(20), @MainEndTime, 120);
    PRINT '  - Duração Total: ' + CAST(@TotalDuration / 60 as varchar(10)) + ' minutos e ' +
          CAST(@TotalDuration % 60 as varchar(10)) + ' segundos';
    PRINT '';
    PRINT 'RESUMO:';
    PRINT '  - Bancos processados: ' + CAST(@ProcessedDatabases as varchar(10)) + '/' + CAST(@TotalDatabases as varchar(10));
    PRINT '  - Total de índices processados: ' + CAST(@TotalIndexesProcessed as varchar(10));
    PRINT '  - Total de tabelas com estatísticas atualizadas: ' + CAST(@TotalTablesProcessed as varchar(10));
    PRINT '  - Total de erros: ' + CAST(@ErrorCount as varchar(10));
    PRINT '';

    IF @ErrorCount > 0
    BEGIN
        PRINT 'STATUS: CONCLUÍDO COM ERROS';
        PRINT 'Verifique os logs para detalhes dos erros.';
    END
    ELSE
    BEGIN
        PRINT 'STATUS: CONCLUÍDO COM SUCESSO';
    END

    PRINT '================================================================================';

    -- Salvar logs na tabela permanente
    IF @LogToTable = 1
    BEGIN
        INSERT INTO [dbo].[MaintenanceLog] (ExecutionID, LogTime, DatabaseName, Operation, ObjectName, Details, DurationSeconds, Status)
        SELECT @ExecutionID, LogTime, DatabaseName, Operation, ObjectName, Details, DurationSeconds, Status
        FROM #SessionLog;

        -- Log final
        INSERT INTO [dbo].[MaintenanceLog] (ExecutionID, DatabaseName, Operation, Details, DurationSeconds, Status)
        VALUES (@ExecutionID, NULL, 'FIM',
                'Bancos: ' + CAST(@ProcessedDatabases as varchar(10)) +
                ', Índices: ' + CAST(@TotalIndexesProcessed as varchar(10)) +
                ', Tabelas: ' + CAST(@TotalTablesProcessed as varchar(10)) +
                ', Erros: ' + CAST(@ErrorCount as varchar(10)),
                @TotalDuration,
                CASE WHEN @ErrorCount > 0 THEN 'COMPLETED_WITH_ERRORS' ELSE 'SUCCESS' END);
    END

    -- Retornar resultado em formato tabular
    SELECT
        @ExecutionID as ExecutionID,
        @ProcessedDatabases as BancosProcessados,
        @TotalIndexesProcessed as IndicesProcessados,
        @TotalTablesProcessed as TabelasAtualizadas,
        @ErrorCount as TotalErros,
        @TotalDuration as DuracaoSegundos,
        CASE WHEN @ErrorCount > 0 THEN 'COMPLETED_WITH_ERRORS' ELSE 'SUCCESS' END as Status;

    -- Limpeza
    DROP TABLE #DatabasesToProcess;
    DROP TABLE #ExcludedDatabases;
    DROP TABLE #IncludedDatabases;
    DROP TABLE #SessionLog;

    IF OBJECT_ID('tempdb..#IndexesToProcess') IS NOT NULL
        DROP TABLE #IndexesToProcess;
    IF OBJECT_ID('tempdb..#TablesToUpdate') IS NOT NULL
        DROP TABLE #TablesToUpdate;

END
GO

-- =============================================
-- EXEMPLOS DE USO
-- =============================================
/*

-- Execução padrão (todos os bancos de usuário)
EXEC sp_MaintenanceAllDatabases;

-- Execução com parâmetros customizados
EXEC sp_MaintenanceAllDatabases
    @FragmentationThreshold = 25.0,
    @ReorganizeThreshold = 5.0,
    @FillFactor = 85;

-- Excluir bancos específicos
EXEC sp_MaintenanceAllDatabases
    @ExcludeDatabases = 'BancoTeste, BancoDesenvolvimento';

-- Processar apenas bancos específicos
EXEC sp_MaintenanceAllDatabases
    @IncludeOnlyDatabases = 'BancoProd1, BancoProd2';

-- Modo debug (não executa, apenas mostra comandos)
EXEC sp_MaintenanceAllDatabases
    @Debug = 1;

-- Consultar logs de execuções anteriores
SELECT TOP 100 *
FROM MaintenanceLog
ORDER BY LogTime DESC;

-- Consultar resumo por execução
SELECT
    ExecutionID,
    MIN(LogTime) as Inicio,
    MAX(LogTime) as Fim,
    COUNT(DISTINCT DatabaseName) as BancosProcessados,
    SUM(CASE WHEN Operation IN ('REBUILD', 'REORGANIZE') THEN 1 ELSE 0 END) as IndicesProcessados,
    SUM(CASE WHEN Operation = 'UPDATE_STATS' THEN 1 ELSE 0 END) as TabelasAtualizadas,
    SUM(CASE WHEN Status = 'ERROR' THEN 1 ELSE 0 END) as Erros
FROM MaintenanceLog
GROUP BY ExecutionID
ORDER BY MIN(LogTime) DESC;

*/

PRINT 'Procedure sp_MaintenanceAllDatabases criada com sucesso!';
GO
