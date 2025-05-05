// Utility functions to safely interact with JUCE API

/**
 * Safely checks if the JUCE API is available
 * @returns {boolean} - Whether the JUCE API is loaded
 */
export const isJuceAvailable = () => {
  return typeof window !== 'undefined' && typeof window.Juce !== 'undefined';
};

/**
 * Safely gets a JUCE slider state
 * @param {string} paramId - The ID of the parameter
 * @returns {object|null} - The slider state or null if not available
 */
export const getSliderState = (paramId) => {
  if (!isJuceAvailable()) return null;
  try {
    return window.Juce.getSliderState(paramId);
  } catch (e) {
    console.error(`Error getting slider state for ${paramId}:`, e);
    return null;
  }
};

/**
 * Safely gets a JUCE toggle state
 * @param {string} paramId - The ID of the parameter
 * @returns {object|null} - The toggle state or null if not available
 */
export const getToggleState = (paramId) => {
  if (!isJuceAvailable()) return null;
  try {
    return window.Juce.getToggleState(paramId);
  } catch (e) {
    console.error(`Error getting toggle state for ${paramId}:`, e);
    return null;
  }
};

/**
 * Safely gets a JUCE choice state
 * @param {string} paramId - The ID of the parameter
 * @returns {object|null} - The choice state or null if not available
 */
export const getChoiceState = (paramId) => {
  if (!isJuceAvailable()) return null;
  try {
    return window.Juce.getChoiceState(paramId);
  } catch (e) {
    console.error(`Error getting choice state for ${paramId}:`, e);
    return null;
  }
};

/**
 * Call a JUCE native function
 * @param {string} functionName - The name of the native function to call
 * @param {Array} args - Arguments to pass to the function
 * @returns {Promise} - Promise that resolves with the result
 */
export const callNativeFunction = (functionName, ...args) => {
  if (!isJuceAvailable()) return Promise.reject('JUCE API not available');
  
  return new Promise((resolve, reject) => {
    try {
      window.Juce.callNativeFunction(functionName, args, (result) => {
        resolve(result);
      });
    } catch (e) {
      reject(e);
    }
  });
};