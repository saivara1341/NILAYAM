
import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { getVacantUnits, assignTenantToUnit, lookupTenantScoreByAadhaar } from '../../services/api';
import { VacantUnit } from '../../types';

interface AddTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preSelectedPropertyId?: string; // New prop for pre-selection
}

const deriveFloorLabel = (houseNumber: string) => {
  const numericMatch = houseNumber.match(/(\d{2,4})(?!.*\d)/);
  if (!numericMatch) return null;

  const numericPart = numericMatch[1];
  if (numericPart.startsWith('0')) return 'Ground Floor';
  if (numericPart.length < 2) return null;

  const floor = Number(numericPart.slice(0, -2));
  if (!Number.isFinite(floor) || floor <= 0) return null;

  const suffix =
    floor % 10 === 1 && floor % 100 !== 11 ? 'st' :
    floor % 10 === 2 && floor % 100 !== 12 ? 'nd' :
    floor % 10 === 3 && floor % 100 !== 13 ? 'rd' :
    'th';

  return `${floor}${suffix} Floor`;
};

const getUnitDisplayLabel = (unit: VacantUnit) => {
  const floorLabel = deriveFloorLabel(unit.house_number);
  return floorLabel ? `${unit.house_number} • ${floorLabel}` : unit.house_number;
};

const AddTenantModal: React.FC<AddTenantModalProps> = ({ isOpen, onClose, onSuccess, preSelectedPropertyId }) => {
  const [vacantUnits, setVacantUnits] = useState<VacantUnit[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState(preSelectedPropertyId || '');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [leaseEnd, setLeaseEnd] = useState('');
  const [moveInDate, setMoveInDate] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceReceivedOn, setAdvanceReceivedOn] = useState('');
  const [createAgreement, setCreateAgreement] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenantScore, setTenantScore] = useState(0);

  useEffect(() => {
    if (isOpen) {
      const fetchUnits = async () => {
        setLoading(true);
        setError(null);
        try {
          const units = await getVacantUnits();
          
          // Filter units if a property is pre-selected
          const filteredUnits = preSelectedPropertyId 
            ? units.filter(u => u.buildings?.id === preSelectedPropertyId)
            : units;
          
          setVacantUnits(filteredUnits);

          const availableBuildingIds = Array.from(
            new Set(filteredUnits.map((unit) => unit.buildings?.id).filter(Boolean))
          ) as string[];

          const nextBuildingId =
            preSelectedPropertyId ||
            (availableBuildingIds.length === 1 ? availableBuildingIds[0] : '');

          setSelectedBuildingId(nextBuildingId);

          const unitsInActiveBuilding = nextBuildingId
            ? filteredUnits.filter((unit) => unit.buildings?.id === nextBuildingId)
            : filteredUnits;

          if (unitsInActiveBuilding.length === 1) {
            setSelectedUnit(unitsInActiveBuilding[0].id);
          }
        } catch (err: any) {
          setError(err.message || 'Failed to load vacant units.');
        } finally {
          setLoading(false);
        }
      };
      fetchUnits();
    } else {
      // Reset form when modal closes
      setName('');
      setPhone('');
      setAadhaarNumber('');
      setLeaseEnd('');
      setMoveInDate('');
      setAdvanceAmount('');
      setAdvanceReceivedOn('');
      setCreateAgreement(true);
      setSelectedBuildingId(preSelectedPropertyId || '');
      setSelectedUnit('');
      setVacantUnits([]);
      setTenantScore(0);
    }
  }, [isOpen, preSelectedPropertyId]);

  useEffect(() => {
    const resolveScore = async () => {
      if (!aadhaarNumber.trim()) {
        setTenantScore(0);
        return;
      }
      const score = await lookupTenantScoreByAadhaar(aadhaarNumber);
      setTenantScore(score);
    };
    void resolveScore();
  }, [aadhaarNumber]);

  const buildingOptions = Array.from(
    new Map(
      vacantUnits
        .filter((unit) => unit.buildings?.id && unit.buildings?.name)
        .map((unit) => [unit.buildings!.id, unit.buildings!])
    ).values()
  );

  const filteredUnits = selectedBuildingId
    ? vacantUnits.filter((unit) => unit.buildings?.id === selectedBuildingId)
    : vacantUnits;

  useEffect(() => {
    if (!selectedBuildingId) {
      if (!preSelectedPropertyId) {
        setSelectedUnit('');
      }
      return;
    }

    const unitStillValid = filteredUnits.some((unit) => unit.id === selectedUnit);
    if (!unitStillValid) {
      setSelectedUnit(filteredUnits.length === 1 ? filteredUnits[0].id : '');
    }
  }, [filteredUnits, preSelectedPropertyId, selectedBuildingId, selectedUnit]);

  const selectedBuildingName = buildingOptions.find((building) => building.id === selectedBuildingId)?.name;
  const selectedUnitMeta = filteredUnits.find((unit) => unit.id === selectedUnit);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await assignTenantToUnit(selectedUnit, {
        name,
        phone,
        aadhaarNumber,
        leaseEnd: createAgreement ? leaseEnd : undefined,
        moveInDate,
        advanceAmount: advanceAmount ? Number(advanceAmount) : 0,
        advanceReceivedOn: advanceReceivedOn || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Tenant">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="building" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Building / Property</label>
          <select
            id="building"
            value={selectedBuildingId}
            onChange={(e) => setSelectedBuildingId(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-slate-700 text-blue-950 dark:text-slate-200"
            disabled={Boolean(preSelectedPropertyId) || buildingOptions.length <= 1}
            required
          >
            <option value="" disabled>Select a building</option>
            {buildingOptions.map((building) => (
              <option key={building.id} value={building.id}>
                {building.name}
              </option>
            ))}
          </select>
          {buildingOptions.length > 1 && !preSelectedPropertyId && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Choose the property first, then we will narrow the vacant portions for you.</p>
          )}
        </div>

        <div>
          <label htmlFor="unit" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Portion / Vacant Unit</label>
          <select
            id="unit"
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-slate-700 text-blue-950 dark:text-slate-200"
            required
            disabled={!selectedBuildingId && buildingOptions.length > 1}
          >
            <option value="" disabled>{selectedBuildingId || buildingOptions.length <= 1 ? 'Select a portion / unit' : 'Select a building first'}</option>
            {filteredUnits.map(unit => (
              <option key={unit.id} value={unit.id}>
                {getUnitDisplayLabel(unit)}
              </option>
            ))}
          </select>
          {selectedUnitMeta && (
            <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50/80 px-3 py-2 text-xs font-medium text-blue-900 dark:border-blue-900/40 dark:bg-blue-900/10 dark:text-blue-100">
              Assigning tenant to <span className="font-bold">{selectedBuildingName || selectedUnitMeta.buildings?.name}</span> • <span className="font-bold">{getUnitDisplayLabel(selectedUnitMeta)}</span>
            </div>
          )}
          {filteredUnits.length === 0 && !loading && (
              <p className="text-xs text-slate-500 mt-1">
                  {preSelectedPropertyId || selectedBuildingId
                    ? "No vacant portions found in this building."
                    : "No vacant units available across your portfolio."}
              </p>
          )}
        </div>
        <div>
          <label htmlFor="tenant-name" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Full Name</label>
          <input
            type="text" id="tenant-name" value={name} onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-slate-700 text-blue-950 dark:text-slate-200" required
          />
        </div>
        <div>
          <label htmlFor="tenant-phone" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Phone Number</label>
          <input
            type="tel" id="tenant-phone" value={phone} onChange={(e) => setPhone(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-slate-700 text-blue-950 dark:text-slate-200" required
          />
        </div>
        <div>
          <label htmlFor="tenant-aadhaar" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Aadhaar Number</label>
          <input
            type="text" id="tenant-aadhaar" value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value.replace(/[^\d]/g, '').slice(0, 12))}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-slate-700 text-blue-950 dark:text-slate-200" placeholder="12-digit Aadhaar number" required
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Matched Nilayam tenant score: <span className="font-bold text-slate-800 dark:text-slate-200">{tenantScore}</span></p>
        </div>
        <div>
          <label htmlFor="move-in" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Move-In Date</label>
          <input
            type="date" id="move-in" value={moveInDate} onChange={(e) => setMoveInDate(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-slate-700 text-blue-950 dark:text-slate-200" required
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="advance-amount" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Advance / Deposit (₹)</label>
            <input
              type="number" id="advance-amount" value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-slate-700 text-blue-950 dark:text-slate-200" min="0" placeholder="0"
            />
          </div>
          <div>
            <label htmlFor="advance-date" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Advance Received On</label>
            <input
              type="date" id="advance-date" value={advanceReceivedOn} onChange={(e) => setAdvanceReceivedOn(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-slate-700 text-blue-950 dark:text-slate-200"
            />
          </div>
        </div>
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 px-4 py-3">
          <input
            type="checkbox"
            checked={createAgreement}
            onChange={(e) => setCreateAgreement(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span>
            <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Create agreement in app</span>
            <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">If enabled, the tenant can view agreement details inside the app and you can manage agreement workflow later.</span>
          </span>
        </label>

        {createAgreement && (
          <>
            <div>
              <label htmlFor="lease-end" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Agreement End Date</label>
              <input
                type="date" id="lease-end" value={leaseEnd} onChange={(e) => setLeaseEnd(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-slate-700 text-blue-950 dark:text-slate-200" required
              />
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        
        <div className="flex justify-end gap-4 pt-4">
            <button
                type="button" onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-600 rounded-md hover:bg-slate-200 dark:hover:bg-slate-500"
            >
                Cancel
            </button>
            <button
                type="submit"
                disabled={loading || !selectedUnit || !name || !phone || !aadhaarNumber || !moveInDate || (createAgreement && !leaseEnd)}
                className="bg-blue-800 dark:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-900 dark:hover:bg-blue-700 transition-colors disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
            >
                {loading ? 'Adding...' : 'Add Tenant'}
            </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddTenantModal;
