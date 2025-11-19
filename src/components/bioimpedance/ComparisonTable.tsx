import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Measurement {
  id: string;
  measurement_date: string;
  weight: number;
  body_fat_percentage?: number;
  muscle_mass?: number;
  water_percentage?: number;
  notes?: any;
}

interface ComparisonTableProps {
  measurements: Measurement[];
}

export const ComparisonTable = ({ measurements }: ComparisonTableProps) => {
  const getTrend = (current: number, previous: number | undefined, isHigherBetter: boolean = false) => {
    if (!previous) return <Minus className="h-4 w-4 text-muted-foreground" />;
    
    const diff = current - previous;
    const isImprovement = isHigherBetter ? diff > 0 : diff < 0;
    
    if (Math.abs(diff) < 0.1) {
      return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
    
    return isImprovement ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  const getValueChange = (current: number, previous: number | undefined) => {
    if (!previous) return null;
    const diff = current - previous;
    const sign = diff > 0 ? '+' : '';
    return `${sign}${diff.toFixed(1)}`;
  };

  const parseAdditionalData = (notes: any) => {
    try {
      if (typeof notes === 'string') {
        return JSON.parse(notes);
      }
      return notes || {};
    } catch {
      return {};
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-background to-muted/20">
      <h3 className="text-xl font-bold mb-4">Histórico de Medições</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-bold">Data</TableHead>
              <TableHead className="font-bold">Peso (kg)</TableHead>
              <TableHead className="font-bold">Gordura (%)</TableHead>
              <TableHead className="font-bold">Músculo (kg)</TableHead>
              <TableHead className="font-bold">Água (%)</TableHead>
              <TableHead className="font-bold">IMC</TableHead>
              <TableHead className="font-bold">Visceral</TableHead>
              <TableHead className="font-bold">TMB (kcal)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {measurements.map((measurement, index) => {
              const previous = measurements[index + 1];
              const additionalData = parseAdditionalData(measurement.notes);
              
              return (
                <TableRow 
                  key={measurement.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="font-medium">
                    {format(new Date(measurement.measurement_date), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{measurement.weight.toFixed(1)}</span>
                      {getTrend(measurement.weight, previous?.weight, false)}
                      {previous && (
                        <span className="text-xs text-muted-foreground">
                          {getValueChange(measurement.weight, previous.weight)}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    {measurement.body_fat_percentage ? (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{measurement.body_fat_percentage.toFixed(1)}%</span>
                        {getTrend(measurement.body_fat_percentage, previous?.body_fat_percentage, false)}
                        {previous?.body_fat_percentage && (
                          <span className="text-xs text-muted-foreground">
                            {getValueChange(measurement.body_fat_percentage, previous.body_fat_percentage)}
                          </span>
                        )}
                      </div>
                    ) : '-'}
                  </TableCell>

                  <TableCell>
                    {measurement.muscle_mass ? (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{measurement.muscle_mass.toFixed(1)}</span>
                        {getTrend(measurement.muscle_mass, previous?.muscle_mass, true)}
                        {previous?.muscle_mass && (
                          <span className="text-xs text-muted-foreground">
                            {getValueChange(measurement.muscle_mass, previous.muscle_mass)}
                          </span>
                        )}
                      </div>
                    ) : '-'}
                  </TableCell>

                  <TableCell>
                    {measurement.water_percentage ? (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{measurement.water_percentage.toFixed(1)}%</span>
                        {getTrend(measurement.water_percentage, previous?.water_percentage, true)}
                      </div>
                    ) : '-'}
                  </TableCell>

                  <TableCell>
                    {additionalData.bmi ? (
                      <span className="font-semibold">{additionalData.bmi.toFixed(1)}</span>
                    ) : '-'}
                  </TableCell>

                  <TableCell>
                    {additionalData.visceral_fat ? (
                      <span className="font-semibold">{additionalData.visceral_fat}</span>
                    ) : '-'}
                  </TableCell>

                  <TableCell>
                    {additionalData.basal_metabolic_rate ? (
                      <span className="font-semibold">{additionalData.basal_metabolic_rate}</span>
                    ) : '-'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};
