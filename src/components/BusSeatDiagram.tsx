import React from 'react';
import { Printer as Steering } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import clsx from 'clsx';

interface BusSeatDiagramProps {
  selectedSeats?: number[];
  onSeatSelect: (seatNumber: number) => void;
  onSeatDeselect?: (seatNumber: number) => void;
  multiSelect?: boolean;
  maxSeats?: number;
}

const BusSeatDiagram: React.FC<BusSeatDiagramProps> = ({ 
  selectedSeats = [], 
  onSeatSelect, 
  onSeatDeselect,
  multiSelect = false,
  maxSeats = 1
}) => {
  const { seatStatus } = useApp();

  const getSeatStatus = (seatNumber: number) => {
    const seat = seatStatus.find(s => s.seat_number === seatNumber);
    return seat?.is_available ?? true;
  };

  const handleSeatClick = (seatNumber: number) => {
    const isAvailable = getSeatStatus(seatNumber);
    const isSelected = selectedSeats.includes(seatNumber);
    
    if (!isAvailable) return;
    
    if (isSelected && onSeatDeselect) {
      onSeatDeselect(seatNumber);
    } else if (!isSelected) {
      if (multiSelect && selectedSeats.length >= maxSeats) {
        // If at max capacity, don't allow more selections
        return;
      }
      onSeatSelect(seatNumber);
    }
  };

  const renderSeat = (seatNumber: number) => {
    const isAvailable = getSeatStatus(seatNumber);
    const isSelected = selectedSeats.includes(seatNumber);

    return (
      <button
        key={seatNumber}
        onClick={() => handleSeatClick(seatNumber)}
        disabled={!isAvailable}
        className={clsx(
          'w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 font-bold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center shadow-sm',
          {
            'bg-green-100 border-green-400 text-green-800 hover:bg-green-200 hover:shadow-md cursor-pointer transform hover:scale-105': isAvailable && !isSelected,
            'bg-blue-500 border-blue-600 text-white shadow-lg transform scale-105': isSelected,
            'bg-red-100 border-red-400 text-red-800 cursor-not-allowed opacity-75': !isAvailable,
          }
        )}
        title={
          !isAvailable 
            ? `Seat ${seatNumber} - Occupied` 
            : isSelected 
              ? `Seat ${seatNumber} - Selected (click to deselect)`
              : `Seat ${seatNumber} - Available`
        }
      >
        {seatNumber}
      </button>
    );
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-6 text-center">
        {multiSelect ? `Select ${maxSeats} Seat${maxSeats > 1 ? 's' : ''}` : 'Select Your Seat'}
      </h3>
      
      {/* Bus Layout Container */}
      <div className="relative bg-gradient-to-b from-gray-100 to-gray-200 p-4 sm:p-6 rounded-2xl border-4 border-gray-400 shadow-inner mx-auto max-w-sm">
        
        {/* Driver Section */}
        <div className="flex justify-center mb-4 sm:mb-6 pb-4 border-b-2 border-gray-400">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-800 rounded-xl flex items-center justify-center shadow-lg">
            <Steering className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div className="ml-2 text-xs text-gray-600 self-end">Driver</div>
        </div>

        {/* Main Seating Area */}
        <div className="space-y-3 sm:space-y-4">
          
          {/* Rows 1-7: 2+2 configuration (seats 1-28) */}
          {Array.from({ length: 7 }, (_, rowIndex) => {
            const leftSeat1 = rowIndex * 4 + 1;
            const leftSeat2 = rowIndex * 4 + 2;
            const rightSeat1 = rowIndex * 4 + 3;
            const rightSeat2 = rowIndex * 4 + 4;
            
            return (
              <div key={`row-${rowIndex}`} className="flex items-center justify-between">
                {/* Left side - 2 seats */}
                <div className="flex gap-1 sm:gap-2">
                  {renderSeat(leftSeat1)}
                  {renderSeat(leftSeat2)}
                </div>
                
                {/* Aisle */}
                <div className="w-6 sm:w-8 h-1 bg-gray-300 rounded"></div>
                
                {/* Right side - 2 seats */}
                <div className="flex gap-1 sm:gap-2">
                  {renderSeat(rightSeat1)}
                  {renderSeat(rightSeat2)}
                </div>
              </div>
            );
          })}

          {/* Back row: 3 seats (seats 29, 30, 31) */}
          <div className="pt-4 border-t-2 border-gray-400">
            <div className="flex justify-center gap-2 sm:gap-3">
              {[29, 30, 31].map(seatNumber => renderSeat(seatNumber))}
            </div>
          </div>
        </div>

        {/* Bus Details */}
        <div className="mt-4 sm:mt-6 pt-4 border-t border-gray-300 text-center">
          <div className="text-xs text-gray-600">
            <div className="font-semibold">Economical Bus</div>
            <div>31 Passenger Seats</div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 sm:gap-6 mt-4 sm:mt-6 text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 sm:w-5 sm:h-5 bg-green-100 border-2 border-green-400 rounded-lg"></div>
          <span className="text-gray-700 font-medium">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 sm:w-5 sm:h-5 bg-blue-500 border-2 border-blue-600 rounded-lg"></div>
          <span className="text-gray-700 font-medium">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 sm:w-5 sm:h-5 bg-red-100 border-2 border-red-400 rounded-lg"></div>
          <span className="text-gray-700 font-medium">Occupied</span>
        </div>
      </div>

      {/* Selection Info */}
      {selectedSeats.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <span className="text-blue-800 font-semibold text-sm sm:text-base">
            Selected: {selectedSeats.map(seat => `Seat ${seat}`).join(', ')}
          </span>
          {multiSelect && (
            <div className="text-xs text-blue-600 mt-1">
              {selectedSeats.length} of {maxSeats} seats selected
            </div>
          )}
        </div>
      )}

      {/* Multi-select Instructions */}
      {multiSelect && maxSeats > 1 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800 text-center">
            💡 <strong>Group Booking:</strong> Select {maxSeats} seats for your passengers. 
            Click selected seats to deselect them.
          </p>
        </div>
      )}
    </div>
  );
};

export default BusSeatDiagram;