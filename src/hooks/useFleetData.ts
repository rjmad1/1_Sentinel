import { useState, useEffect, useCallback } from 'react';
import { getFleetMachines, getCapacityForecast, type FleetMachine } from '../utils/db';

export function useFleetData() {
  const [fleetMachines, setFleetMachines] = useState<FleetMachine[]>([]);
  const [capacityForecast, setCapacityForecast] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const machines = await getFleetMachines();
      setFleetMachines(machines);

      if (machines.length > 0 && machines[0].MachineId) {
        const forecast = await getCapacityForecast(machines[0].MachineId);
        setCapacityForecast(forecast);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load fleet data';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    fleetMachines,
    capacityForecast,
    isLoading,
    error,
    refreshFleet: loadData
  };
}
