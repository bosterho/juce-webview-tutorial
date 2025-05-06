import * as Juce from "./juce/index.js";

console.log("JUCE frontend library successfully imported");

window.__JUCE__.backend.addEventListener(
  "exampleEvent",
  (objectFromBackend) => {
    console.log(objectFromBackend);
  }
);

const data = window.__JUCE__.initialisationData;

document.getElementById("vendor").innerText = data.vendor;
document.getElementById("pluginName").innerText = data.pluginName;
document.getElementById("pluginVersion").innerText = data.pluginVersion;

const nativeFunction = Juce.getNativeFunction("nativeFunction");

document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("nativeFunctionButton");
  button.addEventListener("click", () => {
    nativeFunction("one", 2, null).then((result) => {
      console.log(result);
    });
  });

  const emitEventButton = document.getElementById("emitEventButton");
  let emittedCount = 0;
  emitEventButton.addEventListener("click", () => {
    emittedCount++;
    window.__JUCE__.backend.emitEvent("exampleJavaScriptEvent", {
      emittedCount: emittedCount,
    });
  });

  const slider = document.getElementById("gainSlider");
  const sliderState = Juce.getSliderState("GAIN");
  slider.oninput = function () {
    sliderState.setNormalisedValue(this.value);
  };

  slider.step = 1 / sliderState.properties.numSteps;

  sliderState.valueChangedEvent.addListener(() => {
    slider.value = sliderState.getNormalisedValue();
  });

  const bypassCheckbox = document.getElementById("bypassCheckbox");
  const bypassToggleState = Juce.getToggleState("BYPASS");
  bypassCheckbox.oninput = function () {
    bypassToggleState.setValue(this.checked);
  };
  bypassToggleState.valueChangedEvent.addListener(() => {
    bypassCheckbox.checked = bypassToggleState.getValue();
  });

  const distortionTypeComboBox = document.getElementById(
    "distortionTypeComboBox"
  );
  const distortionTypeComboBoxState = Juce.getComboBoxState(
    "DISTORTION_TYPE"
  );
  distortionTypeComboBoxState.propertiesChangedEvent.addListener(() => {
    distortionTypeComboBox.innerHTML = "";
    distortionTypeComboBoxState.properties.choices.forEach((choice) => {
      distortionTypeComboBox.innerHTML += `<option value=\"${choice}\">${choice}</option>`;
    });
  });
  distortionTypeComboBoxState.valueChangedEvent.addListener(() => {
    distortionTypeComboBox.selectedIndex =
      distortionTypeComboBoxState.getChoiceIndex();
  });
  distortionTypeComboBox.oninput = function () {
    distortionTypeComboBoxState.setChoiceIndex(this.selectedIndex);
  };

  // Bar Editor Implementation
  const barEditor = document.getElementById("barEditor");
  const numBars = 8;
  const barValues = Array(numBars).fill(0.5); // Initial values at 50%
  let isMouseDown = false;
  
  // Create the 8 bars
  for (let i = 0; i < numBars; i++) {
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.dataset.index = i;
    bar.style.height = `${barValues[i] * 100}%`;
    barEditor.appendChild(bar);
  }
  
  // Mouse event handlers
  function handleMouseMove(e) {
    if (!isMouseDown) return;
    
    // Get bar under cursor or closest bar
    const rect = barEditor.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const barWidth = rect.width / numBars;
    const barIndex = Math.min(Math.floor(x / barWidth), numBars - 1);
    
    // Calculate value based on Y position (inverted since 0 is top)
    const y = e.clientY - rect.top;
    const value = 1 - Math.max(0, Math.min(1, y / rect.height));
    
    // Set the height of the bar
    updateBar(barIndex, value);
    
    // Send the updated values to backend
    sendBarValuesToBackend();
  }
  
  function updateBar(index, value) {
    barValues[index] = value;
    const bar = barEditor.children[index];
    if (bar) {
      bar.style.height = `${value * 100}%`;
    }
  }
  
  // Function to send bar values to C++ backend
  function sendBarValuesToBackend() {
    // Convert bar values to MIDI velocities (0-127)
    const midiVelocities = barValues.map(value => Math.round(value * 127));
    
    // Send to backend using JUCE event system
    window.__JUCE__.backend.emitEvent("barEditorUpdate", { 
      barValues: barValues,
      midiVelocities: midiVelocities
    });
  }
  
  barEditor.addEventListener("mousedown", (e) => {
    isMouseDown = true;
    handleMouseMove(e); // Update immediately on click
  });
  
  document.addEventListener("mouseup", () => {
    if (isMouseDown) {
      // Final update when mouse is released
      sendBarValuesToBackend();
    }
    isMouseDown = false;
  });
  
  document.addEventListener("mouseleave", () => {
    isMouseDown = false;
  });
  
  barEditor.addEventListener("mousemove", handleMouseMove);
  
  // Function to get the current bar values (can be used to integrate with JUCE)
  function getBarValues() {
    return [...barValues];
  }
  
  // You can expose this function to your JUCE backend if needed
  window.getBarValues = getBarValues;

  // Plot with Plotly
  const base = -60;
  Plotly.newPlot("outputLevelPlot", {
    data: [
      {
        x: ["left"],
        y: [base],
        base: [base],
        type: "bar",
      },
    ],
    layout: { width: 200, height: 400, yaxis: { range: [-60, 0] } },
  });

  window.__JUCE__.backend.addEventListener("outputLevel", () => {
    fetch(Juce.getBackendResourceAddress("outputLevel.json"))
      .then((response) => response.text())
      .then((outputLevel) => {
        const levelData = JSON.parse(outputLevel);
        Plotly.animate(
          "outputLevelPlot",
          {
            data: [
              {
                y: [levelData.left - base],
              },
            ],
            traces: [0],
            layout: {},
          },
          {
            transition: {
              duration: 20,
              easing: "cubic-in-out",
            },
            frame: {
              duration: 20,
            },
          }
        );
      });
  });
});
