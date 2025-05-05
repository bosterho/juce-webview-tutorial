#include "JuceWebViewTutorial/PluginProcessor.h"
#include <juce_audio_processors/juce_audio_processors.h>
#include "JuceWebViewTutorial/PluginEditor.h"
#include "JuceWebViewTutorial/ParameterIDs.hpp"
#include <cmath>
#include <functional>
#include <juce_dsp/juce_dsp.h>

namespace webview_plugin {
AudioPluginAudioProcessor::AudioPluginAudioProcessor()
    : AudioProcessor(
          BusesProperties()
#if !JucePlugin_IsMidiEffect
#if !JucePlugin_IsSynth
              .withInput("Input", juce::AudioChannelSet::stereo(), true)
#endif
              .withOutput("Output", juce::AudioChannelSet::stereo(), true)
#endif
              ),
      state{*this, nullptr, "PARAMETERS", createParameterLayout(parameters)} {
}

AudioPluginAudioProcessor::~AudioPluginAudioProcessor() {}

const juce::String AudioPluginAudioProcessor::getName() const {
  return JucePlugin_Name;
}

bool AudioPluginAudioProcessor::acceptsMidi() const {
#if JucePlugin_WantsMidiInput
  return true;
#else
  return false;
#endif
}

bool AudioPluginAudioProcessor::producesMidi() const {
#if JucePlugin_ProducesMidiOutput
  return true;
#else
  return false;
#endif
}

bool AudioPluginAudioProcessor::isMidiEffect() const {
#if JucePlugin_IsMidiEffect
  return true;
#else
  return false;
#endif
}

double AudioPluginAudioProcessor::getTailLengthSeconds() const {
  return 0.0;
}

int AudioPluginAudioProcessor::getNumPrograms() {
  return 1;  // NB: some hosts don't cope very well if you tell them there are 0
             // programs, so this should be at least 1, even if you're not
             // really implementing programs.
}

int AudioPluginAudioProcessor::getCurrentProgram() {
  return 0;
}

void AudioPluginAudioProcessor::setCurrentProgram(int index) {
  juce::ignoreUnused(index);
}

const juce::String AudioPluginAudioProcessor::getProgramName(int index) {
  juce::ignoreUnused(index);
  return {};
}

void AudioPluginAudioProcessor::changeProgramName(int index,
                                                  const juce::String& newName) {
  juce::ignoreUnused(index, newName);
}

void AudioPluginAudioProcessor::prepareToPlay(double sampleRate,
                                              int samplesPerBlock) {
  using namespace juce;

  envelopeFollower.prepare(dsp::ProcessSpec{
      .sampleRate = sampleRate,
      .maximumBlockSize = static_cast<uint32>(samplesPerBlock),
      .numChannels = static_cast<uint32>(getTotalNumOutputChannels())});
  envelopeFollower.setAttackTime(200.f);
  envelopeFollower.setReleaseTime(200.f);
  envelopeFollower.setLevelCalculationType(
      dsp::BallisticsFilter<float>::LevelCalculationType::peak);

  envelopeFollowerOutputBuffer.setSize(getTotalNumOutputChannels(),
                                       samplesPerBlock);
}

void AudioPluginAudioProcessor::releaseResources() {
  // When playback stops, you can use this as an opportunity to free up any
  // spare memory, etc.
}

bool AudioPluginAudioProcessor::isBusesLayoutSupported(
    const BusesLayout& layouts) const {
#if JucePlugin_IsMidiEffect
  juce::ignoreUnused(layouts);
  return true;
#else
  // This is the place where you check if the layout is supported.
  // In this template code we only support mono or stereo.
  // Some plugin hosts, such as certain GarageBand versions, will only
  // load plugins that support stereo bus layouts.
  if (layouts.getMainOutputChannelSet() != juce::AudioChannelSet::mono() &&
      layouts.getMainOutputChannelSet() != juce::AudioChannelSet::stereo())
    return false;

    // This checks if the input layout matches the output layout
#if !JucePlugin_IsSynth
  if (layouts.getMainOutputChannelSet() != layouts.getMainInputChannelSet())
    return false;
#endif

  return true;
#endif
}

void AudioPluginAudioProcessor::processBlock(juce::AudioBuffer<float>& buffer,
                                             juce::MidiBuffer& midiMessages) {
  juce::ScopedNoDenormals noDenormals;
  auto totalNumInputChannels = getTotalNumInputChannels();
  auto totalNumOutputChannels = getTotalNumOutputChannels();

  // In case we have more outputs than inputs, this code clears any output
  // channels that didn't contain input data
  for (auto i = totalNumInputChannels; i < totalNumOutputChannels; ++i)
    buffer.clear(i, 0, buffer.getNumSamples());

  // Process MIDI with harmonics
  if (harmonicEnabled) {
    juce::MidiBuffer processedMidi;
    const juce::ScopedLock lock(harmonicLock);
    
    for (const auto metadata : midiMessages) {
      const auto message = metadata.getMessage();
      const auto time = metadata.samplePosition;
      
      // Add the original MIDI message to our output buffer
      processedMidi.addEvent(message, time);
      
      if (message.isNoteOn()) {
        // Create a new ActiveNote entry to track this note and its harmonics
        auto* activeNote = new ActiveNote();
        activeNote->rootNote = message.getNoteNumber();
        
        // Calculate velocities for harmonic notes based on our harmonicValues
        const int velocity = message.getVelocity();
        
        // Process each harmonic (skip the first one as it's the fundamental)
        for (int h = 1; h < harmonicValues.size(); ++h) {
          // Calculate the note for this harmonic
          // (harmonic n = n times the fundamental frequency)
          const float normalizedHarmonicValue = harmonicValues[h] / 100.0f; // Convert 0-100 to 0-1
          
          if (normalizedHarmonicValue > 0.01f) { // Only add harmonics with sufficient amplitude
            // Calculate the MIDI note number for this harmonic
            // Each octave is 12 semitones, log2(n) gives how many octaves above the fundamental
            const float harmonicMultiple = h + 1; // Harmonic index + 1 (e.g., h=1 is the 2nd harmonic)
            const float harmonicSemitones = 12.0f * std::log2(harmonicMultiple);
            
            // Round to nearest semitone
            const int semitonesUp = std::round(harmonicSemitones);
            int harmonicNote = message.getNoteNumber() + semitonesUp;
            
            // Ensure we don't exceed MIDI note range (0-127)
            if (harmonicNote > 127) 
              continue;
            
            // Set velocity based on the harmonic value (scaled by the original note velocity)
            const int harmonicVelocity = juce::jlimit(1, 127, 
              static_cast<int>(velocity * normalizedHarmonicValue));
            
            // Create MIDI note on for this harmonic
            const juce::MidiMessage harmonicNoteOn = juce::MidiMessage::noteOn(
              message.getChannel(), 
              harmonicNote, 
              static_cast<juce::uint8>(harmonicVelocity));
            
            // Add to the processed buffer
            processedMidi.addEvent(harmonicNoteOn, time);
            
            // Track this harmonic note
            activeNote->harmonicNotes.add(harmonicNote);
          }
        }
        
        // Store this active note
        activeNotes.add(activeNote);
      }
      else if (message.isNoteOff()) {
        // Find the corresponding active note
        const int noteNumber = message.getNoteNumber();
        
        for (int i = activeNotes.size() - 1; i >= 0; --i) {
          if (activeNotes[i]->rootNote == noteNumber) {
            // Generate note offs for all harmonics of this note
            for (const auto& harmonicNote : activeNotes[i]->harmonicNotes) {
              const juce::MidiMessage harmonicNoteOff = juce::MidiMessage::noteOff(
                message.getChannel(), harmonicNote);
              processedMidi.addEvent(harmonicNoteOff, time);
            }
            
            // Remove from active notes
            activeNotes.remove(i);
          }
        }
      }
      else if (message.isAllNotesOff()) {
        // Clear all active notes on all notes off message
        activeNotes.clear();
      }
    }
    
    // Replace the original MIDI buffer with our processed one
    midiMessages.swapWith(processedMidi);
  }

  if (parameters.bypass->get() || buffer.getNumSamples() == 0) {
    return;
  }

  juce::dsp::AudioBlock<float> block{buffer};
  if (parameters.distortionType->getIndex() == 1) {
    // tanh(kx)/tanh(k)
    juce::dsp::AudioBlock<float>::process(block, block, [](float sample) {
      constexpr auto SATURATION = 5.f;
      static const auto normalizationFactor = std::tanh(SATURATION);
      sample = std::tanh(SATURATION * sample) / normalizationFactor;
      return sample;
    });
  } else if (parameters.distortionType->getIndex() == 2) {
    // sigmoid
    juce::dsp::AudioBlock<float>::process(block, block, [](float sample) {
      constexpr auto SATURATION = 5.f;
      sample = 2.f / (1.f + std::exp(-SATURATION * sample)) - 1.f;
      return sample;
    });
  }

  buffer.applyGain(parameters.gain->get());

  // Apply panning
  if (buffer.getNumChannels() >= 2) {
    // Convert pan parameter from 0-1 range to -1 to 1 range
    const float panValue = 2.0f * parameters.pan->get() - 1.0f; // -1 (left) to 1 (right)
    
    // Apply equal power panning
    const float leftGain = std::cos((panValue + 1.0f) * juce::MathConstants<float>::pi * 0.25f);
    const float rightGain = std::sin((panValue + 1.0f) * juce::MathConstants<float>::pi * 0.25f);
    
    buffer.applyGain(0, 0, buffer.getNumSamples(), leftGain);
    buffer.applyGain(1, 0, buffer.getNumSamples(), rightGain);
  }

  const auto inBlock =
      juce::dsp::AudioBlock<float>{buffer}.getSubsetChannelBlock(
          0u, static_cast<size_t>(getTotalNumOutputChannels()));
  auto outBlock =
      juce::dsp::AudioBlock<float>{envelopeFollowerOutputBuffer}.getSubBlock(
          0u, static_cast<size_t>(buffer.getNumSamples()));
  envelopeFollower.process(
      juce::dsp::ProcessContextNonReplacing<float>{inBlock, outBlock});
  outputLevelLeft = juce::Decibels::gainToDecibels(
      outBlock.getSample(0, static_cast<int>(outBlock.getNumSamples()) - 1));
}

bool AudioPluginAudioProcessor::hasEditor() const {
  return true;  // (change this to false if you choose to not supply an editor)
}

juce::AudioProcessorEditor* AudioPluginAudioProcessor::createEditor() {
  return new AudioPluginAudioProcessorEditor(*this);
}

void AudioPluginAudioProcessor::getStateInformation(
    juce::MemoryBlock& destData) {
  // You should use this method to store your parameters in the memory block.
  // You could do that either as raw data, or use the XML or ValueTree classes
  // as intermediaries to make it easy to save and load complex data.
  juce::ignoreUnused(destData);
}

void AudioPluginAudioProcessor::setStateInformation(const void* data,
                                                    int sizeInBytes) {
  // You should use this method to restore your parameters from this memory
  // block, whose contents will have been created by the getStateInformation()
  // call.
  juce::ignoreUnused(data, sizeInBytes);
}

juce::AudioProcessorValueTreeState::ParameterLayout
AudioPluginAudioProcessor::createParameterLayout(
    AudioPluginAudioProcessor::Parameters& parameters) {
  using namespace juce;
  AudioProcessorValueTreeState::ParameterLayout layout;

  {
    auto parameter = std::make_unique<AudioParameterFloat>(
        id::GAIN, "gain", NormalisableRange<float>{0.f, 1.f, 0.01f, 0.9f}, 1.f);
    parameters.gain = parameter.get();
    layout.add(std::move(parameter));
  }

  {
    auto parameter = std::make_unique<AudioParameterBool>(
        id::BYPASS, "bypass", false,
        AudioParameterBoolAttributes{}.withLabel("Bypass"));
    parameters.bypass = parameter.get();
    layout.add(std::move(parameter));
  }

  {
    auto parameter = std::make_unique<AudioParameterChoice>(
        id::DISTORTION_TYPE, "distortion type",
        StringArray{"none", "tanh(kx)/tanh(k)", "sigmoid"}, 0);
    parameters.distortionType = parameter.get();
    layout.add(std::move(parameter));
  }

  {
    auto parameter = std::make_unique<AudioParameterFloat>(
        id::PAN, "pan", NormalisableRange<float>{0.f, 1.f, 0.01f, 0.5f}, 0.5f);
    parameters.pan = parameter.get();
    layout.add(std::move(parameter));
  }

  return layout;
}

void AudioPluginAudioProcessor::setHarmonicValues(const juce::Array<float>& newValues) {
  const juce::ScopedLock lock(harmonicLock);
  harmonicValues = newValues;
}

}  // namespace webview_plugin

// This creates new instances of the plugin.
// This function definition must be in the global namespace.
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter() {
  return new webview_plugin::AudioPluginAudioProcessor();
}
