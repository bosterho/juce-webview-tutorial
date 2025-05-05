#include "JuceWebViewTutorial/PluginEditor.h"
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_events/juce_events.h>
#include <optional>
#include <ranges>
#include "JuceWebViewTutorial/PluginProcessor.h"
#include "juce_core/juce_core.h"
#include "juce_graphics/juce_graphics.h"
#include "juce_gui_extra/juce_gui_extra.h"
#include "JuceWebViewTutorial/ParameterIDs.hpp"
#include <WebViewFiles.h>

namespace webview_plugin {

// Development mode toggle - set to true to use the dev server with hot reloading
constexpr bool USE_DEV_SERVER = true;

namespace {
std::vector<std::byte> streamToVector(juce::InputStream& stream) {
  using namespace juce;
  const auto sizeInBytes = static_cast<size_t>(stream.getTotalLength());
  std::vector<std::byte> result(sizeInBytes);
  stream.setPosition(0);
  [[maybe_unused]] const auto bytesRead =
      stream.read(result.data(), result.size());
  jassert(bytesRead == static_cast<ssize_t>(sizeInBytes));
  return result;
}

static const char* getMimeForExtension(const juce::String& extension) {
  static const std::unordered_map<juce::String, const char*> mimeMap = {
      {{"htm"}, "text/html"},
      {{"html"}, "text/html"},
      {{"txt"}, "text/plain"},
      {{"jpg"}, "image/jpeg"},
      {{"jpeg"}, "image/jpeg"},
      {{"svg"}, "image/svg+xml"},
      {{"ico"}, "image/vnd.microsoft.icon"},
      {{"json"}, "application/json"},
      {{"png"}, "image/png"},
      {{"css"}, "text/css"},
      {{"map"}, "application/json"},
      {{"js"}, "text/javascript"},
      {{"woff2"}, "font/woff2"}};

  if (const auto it = mimeMap.find(extension.toLowerCase());
      it != mimeMap.end())
    return it->second;

  jassertfalse;
  return "";
}

juce::Identifier getExampleEventId() {
  static const juce::Identifier id{"exampleEvent"};
  return id;
}

#ifndef ZIPPED_FILES_PREFIX
#error \
    "You must provide the prefix of zipped web UI files' paths, e.g., 'public/', in the ZIPPED_FILES_PREFIX compile definition"
#endif

/**
 * @brief Get a web UI file as bytes
 *
 * @param filepath path of the form "index.html", "js/index.js", etc.
 * @return std::vector<std::byte> with bytes of a read file or an empty vector
 * if the file is not contained in webview_files.zip
 */
std::vector<std::byte> getWebViewFileAsBytes(const juce::String& filepath) {
  juce::MemoryInputStream zipStream{webview_files::webview_files_zip,
                                    webview_files::webview_files_zipSize,
                                    false};
  juce::ZipFile zipFile{zipStream};

  if (auto* zipEntry = zipFile.getEntry(ZIPPED_FILES_PREFIX + filepath)) {
    const std::unique_ptr<juce::InputStream> entryStream{
        zipFile.createStreamForEntry(*zipEntry)};

    if (entryStream == nullptr) {
      jassertfalse;
      return {};
    }

    return streamToVector(*entryStream);
  }

  return {};
}

constexpr auto LOCAL_DEV_SERVER_ADDRESS = "http://127.0.0.1:8080";

}  // namespace

AudioPluginAudioProcessorEditor::AudioPluginAudioProcessorEditor(
    AudioPluginAudioProcessor& p)
    : AudioProcessorEditor(&p),
      processorRef(p),
      gainSliderAttachment{
          *processorRef.getState().getParameter(id::GAIN.getParamID()),
          gainSlider, nullptr},
      bypassButtonAttachment{
          *processorRef.getState().getParameter(id::BYPASS.getParamID()),
          bypassButton, nullptr},
      webGainRelay{id::GAIN.getParamID()},
      webBypassRelay{id::BYPASS.getParamID()},
      webView{
          juce::WebBrowserComponent::Options{}
              .withBackend(
                  juce::WebBrowserComponent::Options::Backend::webview2)
              .withWinWebView2Options(
                  juce::WebBrowserComponent::Options::WinWebView2{}
                      .withBackgroundColour(juce::Colours::white)
                      .withUserDataFolder(juce::File::getSpecialLocation(
                          juce::File::SpecialLocationType::tempDirectory)))
              .withNativeIntegrationEnabled()
              .withResourceProvider(
                  [this](const auto& url) { return getResource(url); },
                  juce::URL{LOCAL_DEV_SERVER_ADDRESS}.getOrigin())
              .withInitialisationData("vendor", JUCE_COMPANY_NAME)
              .withInitialisationData("pluginName", JUCE_PRODUCT_NAME)
              .withInitialisationData("pluginVersion", JUCE_PRODUCT_VERSION)
              .withNativeFunction(
                  juce::Identifier{"nativeFunction"},
                  [this](const juce::Array<juce::var>& args,
                         juce::WebBrowserComponent::NativeFunctionCompletion
                             completion) {
                    nativeFunction(args, std::move(completion));
                  })
              .withOptionsFrom(webGainRelay)
              .withOptionsFrom(webBypassRelay)},
      webGainSliderAttachment{
          *processorRef.getState().getParameter(id::GAIN.getParamID()),
          webGainRelay, nullptr},
      webBypassToggleAttachment{
          *processorRef.getState().getParameter(id::BYPASS.getParamID()),
          webBypassRelay, nullptr} {
  // Add components to the editor
  addAndMakeVisible(webView);
  addAndMakeVisible(gainSlider);
  addAndMakeVisible(bypassButton);
  addAndMakeVisible(infoLabel);

  // Set up UI components
  gainSlider.setSliderStyle(juce::Slider::SliderStyle::LinearBar);
  infoLabel.setJustificationType(juce::Justification::centred);

  // Configure the window
  setResizable(true, true);
  setSize(800, 600);
  
  // Load the web UI either from dev server or from bundled resources
  if (USE_DEV_SERVER) {
    // Connect directly to the React dev server for hot reloading
    webView.goToURL(LOCAL_DEV_SERVER_ADDRESS);
    infoLabel.setText("DEVELOPMENT MODE: Connected to React dev server", 
                     juce::dontSendNotification);
  } else {
  //   // Use the bundled resources
    webView.goToURL(juce::WebBrowserComponent::getResourceProviderRoot());
  }
}

AudioPluginAudioProcessorEditor::~AudioPluginAudioProcessorEditor() {}

void AudioPluginAudioProcessorEditor::resized() {
  auto bounds = getBounds();
  
  // Split the view into left and right sections
  webView.setBounds(bounds.removeFromRight(getWidth() / 2));
  
  // Layout the native UI components on the left side
  infoLabel.setBounds(bounds.removeFromTop(50).reduced(5));
  gainSlider.setBounds(bounds.removeFromTop(50).reduced(5));
  bypassButton.setBounds(bounds.removeFromTop(50).reduced(10));

}

void AudioPluginAudioProcessorEditor::timerCallback() {
  // Removed the outputLevel event since we've simplified the UI
}

auto AudioPluginAudioProcessorEditor::getResource(const juce::String& url) const
    -> std::optional<Resource> {
  std::cout << "ResourceProvider called with " << url << std::endl;

  const auto resourceToRetrieve =
      url == "/" ? "index.html" : url.fromFirstOccurrenceOf("/", false, false);

  if (resourceToRetrieve == "outputLevel.json") {
    juce::DynamicObject::Ptr levelData{new juce::DynamicObject{}};
    levelData->setProperty("left", processorRef.outputLevelLeft.load());
    const auto jsonString = juce::JSON::toString(levelData.get());
    juce::MemoryInputStream stream{jsonString.getCharPointer(),
                                   jsonString.getNumBytesAsUTF8(), false};
    return juce::WebBrowserComponent::Resource{
        streamToVector(stream), juce::String{"application/json"}};
  }

  const auto resource = getWebViewFileAsBytes(resourceToRetrieve);
  if (!resource.empty()) {
    const auto extension =
        resourceToRetrieve.fromLastOccurrenceOf(".", false, false);
    return Resource{std::move(resource), getMimeForExtension(extension)};
  }

  return std::nullopt;
}

void AudioPluginAudioProcessorEditor::nativeFunction(
    const juce::Array<juce::var>& args,
    juce::WebBrowserComponent::NativeFunctionCompletion completion) {
  // The first argument should be the function name
  if (args.isEmpty())
  {
    completion("Error: No function name provided");
    return;
  }

  const juce::String functionName = args[0].toString();
  
  // Handle different function calls based on the function name
  if (functionName == "updateHarmonics")
  {
    // Expected format: ["updateHarmonics", [harmonic1, harmonic2, ...]]
    if (args.size() < 2 || !args[1].isArray())
    {
      completion("Error: updateHarmonics requires an array of harmonic values");
      return;
    }

    // Extract harmonic values
    juce::Array<float> harmonicValues;
    juce::Array<juce::var>* harmonicsArray = args[1].getArray();
    
    for (const auto& value : *harmonicsArray)
    {
      harmonicValues.add(static_cast<float>(value));
    }

    // Pass the harmonic values to the processor
    auto& processor = static_cast<AudioPluginAudioProcessor&>(*getAudioProcessor());
    processor.setHarmonicValues(harmonicValues);
    
    infoLabel.setText(
        "Harmonics updated: " + juce::String(harmonicValues.size()) + " values",
        juce::dontSendNotification);
    
    completion("Harmonics updated successfully");
    return;
  }
  else
  {
    // Legacy behavior for other function calls
    using namespace std::views;
    juce::String concatenatedString;
    for (const auto& string : args | transform(&juce::var::toString)) {
      concatenatedString += string;
    }
    infoLabel.setText(
        "Native function called with args: " + concatenatedString,
        juce::dontSendNotification);
    completion("nativeFunction callback: All OK!");
  }
}
}  // namespace webview_plugin
