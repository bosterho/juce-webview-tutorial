#pragma once

#include "PluginProcessor.h"
#include "juce_gui_basics/juce_gui_basics.h"
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_extra/juce_gui_extra.h>

namespace webview_plugin {

class AudioPluginAudioProcessorEditor : public juce::AudioProcessorEditor,
                                        private juce::Timer {
public:
  explicit AudioPluginAudioProcessorEditor(AudioPluginAudioProcessor&);
  ~AudioPluginAudioProcessorEditor() override;

  void resized() override;

  void timerCallback() override;

private:
  using Resource = juce::WebBrowserComponent::Resource;
  std::optional<Resource> getResource(const juce::String& url) const;
  void nativeFunction(
      const juce::Array<juce::var>& args,
      juce::WebBrowserComponent::NativeFunctionCompletion completion);

  AudioPluginAudioProcessor& processorRef;

  // Native UI - Only one slider, one button, and one label
  juce::Slider gainSlider{"gain slider"};
  juce::SliderParameterAttachment gainSliderAttachment;
  juce::ToggleButton bypassButton{"Bypass"};
  juce::ButtonParameterAttachment bypassButtonAttachment;
  juce::Label infoLabel{"info label", "Simple UI"};

  // Web UI - Only keep what we need
  juce::WebSliderRelay webGainRelay;
  juce::WebToggleButtonRelay webBypassRelay;
  juce::WebBrowserComponent webView;
  juce::WebSliderParameterAttachment webGainSliderAttachment;
  juce::WebToggleButtonParameterAttachment webBypassToggleAttachment;

  JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(AudioPluginAudioProcessorEditor)
};
}  // namespace webview_plugin
