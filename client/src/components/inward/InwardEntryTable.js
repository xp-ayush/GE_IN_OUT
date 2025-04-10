import React from 'react';
import './InwardEntryTable.css';

const InwardEntryTable = ({ entries, onTimeoutUpdate }) => {
  const renderMaterialsCell = (materials_list) => {
    if (!materials_list || !Array.isArray(materials_list) || materials_list.length === 0) {
      return <td>-</td>;
    }

    return (
      <td className="materials-cell">
        <table className="materials-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Qty</th>
              <th>UoM</th>
            </tr>
          </thead>
          <tbody>
            {materials_list.map((material, idx) => (
              <tr key={idx}>
                <td>{material.name || '-'}</td>
                <td>{material.quantity || '-'}</td>
                <td>{material.uom || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </td>
    );
  };

  return (
    <div className="inward-entry-table">
      <table>
        <thead>
          <tr>
            <th>Serial No.</th>
            <th>Date</th>
            <th>Party Name</th>
            <th>Bill No.</th>
            <th>Bill Amount</th>
            <th>Entry Type</th>
            <th>Vehicle Type</th>
            <th>Source Location</th>
            <th>Time In</th>
            <th>Time Out</th>
            <th>Materials</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(entry => (
            <tr key={entry.id || Math.random()}>
              <td>{entry.serial_number}</td>
              <td>{new Date(entry.entry_date).toLocaleDateString()}</td>
              <td>{entry.party_name || '-'}</td>
              <td>{entry.bill_number || '-'}</td>
              <td>{entry.bill_amount || '-'}</td>
              <td>{entry.entry_type || '-'}</td>
              <td>{entry.vehicle_type || '-'}</td>
              <td>{entry.source_location || '-'}</td>
              <td>{entry.time_in || '-'}</td>
              <td>
                {entry.time_out ? (
                  entry.time_out
                ) : (
                  <button
                    className="update-timeout-button"
                    onClick={() => onTimeoutUpdate(entry.id)}
                  >
                    Update Time Out
                  </button>
                )}
              </td>
              {renderMaterialsCell(entry.materials_list)}
              <td>{entry.remarks || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InwardEntryTable;
