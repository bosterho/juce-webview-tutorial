import React, { useState, useCallback } from 'react';

/**
 * A component for selecting a musical note
 * @param {Object} props
 * @param {number} props.value - The current MIDI note number
 * @param {function} props.onChange - Callback when note changes
 * @param {string} props.title - Display title for the control
 * @param {number} props.minNote - Minimum selectable MIDI note (default: 36 = C2)
 * @param {number} props.maxNote - Maximum selectable MIDI note (default: 84 = C6)
 */
const NoteSelector = ({ 
  value = 60, 
  onChange = () => {},
  title = "Note",
  minNote = 36,
  maxNote = 84
}) => {
  // Generate options for note dropdown
  const getNoteOptions = useCallback(() => {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const options = [];
    
    // Generate options for the specified MIDI note range
    for (let midiNote = minNote; midiNote <= maxNote; midiNote++) {
      const noteIndex = midiNote % 12;
      const octave = Math.floor(midiNote / 12) - 1;
      const noteName = noteNames[noteIndex] + octave;
      options.push({ value: midiNote, label: noteName });
    }
    
    return options;
  }, [minNote, maxNote]);

  // Handle note change
  const handleNoteChange = (e) => {
    const newNote = parseInt(e.target.value, 10);
    onChange(newNote);
  };

  return (
    <div className="control note-selector">
      <div className="control-header">
        <h3 className="control-title">{title}</h3>
      </div>
      <select 
        value={value} 
        onChange={handleNoteChange}
        className="note-select"
      >
        {getNoteOptions().map(option => (
          <option key={option.value} value={option.value}>
            {option.label} ({option.value})
          </option>
        ))}
      </select>
    </div>
  );
};

export default NoteSelector;