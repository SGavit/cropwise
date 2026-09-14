export const appLanguages = ["en", "hi", "mr"] as const;

export type AppLanguage = (typeof appLanguages)[number];

export const languageLabels: Record<AppLanguage, string> = {
  en: "English",
  hi: "हिंदी",
  mr: "मराठी",
};

export type DashboardCopy = {
  greeting: string;
  weather: string;
  market: string;
  refresh: string;
  farmProfile: string;
  scanHistory: string;
  save: string;
  live: string;
  unavailable: string;
  language: string;
  chooseLanguage: string;
  myFarm: string;
  currentSeason: string;
  cropCycle: string;
  cropShortlist: string;
  weatherLoading: string;
  weatherEmpty: string;
  refreshWeather: string;
  marketFallback: string;
  changeValues: string;
  profilePrivateNote: string;
  historyEmpty: string;
  signIn: string;
  village: string;
  district: string;
  state: string;
  cancel: string;
  overview: string;
  openMenu: string;
  closePanel: string;
  changeLocation: string;
  currentLocationActive: string;
  workspace: string;
  fieldTool: string;
  currentLocationPrompt: string;
  currentLocationPrivacy: string;
  findingLocation: string;
  useCurrentLocation: string;
  locationUnavailable: string;
  addManualLocation: string;
  manualLocationDescription: string;
  saveFarmLocation: string;
  cropPreferences: string;
  saving: string;
  privateHistorySignIn: string;
  loadingScans: string;
  switchAccount: string;
  signInOrSwitch: string;
  signOut: string;
  heroTitle: string;
  heroAccent: string;
  heroDescription: string;
  seeSoilFit: string;
  dailyBrief: string;
  goodMorning: string;
  feelsLike: string;
  rain: string;
  humidity: string;
  perQuintal: string;
  observed: string;
  trend30Days: string;
  cropCalendar: string;
  recommendationTitle: string;
  soilReport: string;
};

export function personalizeDashboardCopy(template: string, displayName: string) {
  const name = displayName.trim();
  if (!name) return template;
  return template.replace(/Ravi|रवि|रवी/g, name);
}

export const languageCopy: Record<AppLanguage, DashboardCopy> = {
  en: {
    greeting: "Today on your farm", weather: "Weather window", market: "Market pulse", refresh: "Refresh live data", farmProfile: "Farm profile", scanHistory: "Scan history", save: "Save profile", live: "Live", unavailable: "Unavailable", language: "Language", chooseLanguage: "Choose language", myFarm: "My farm", currentSeason: "Current season", cropCycle: "Crop cycle", cropShortlist: "Your crop shortlist", weatherLoading: "Loading conditions…", weatherEmpty: "Add a district to load live weather.", refreshWeather: "Refresh weather", marketFallback: "Your crop values", changeValues: "Change values", profilePrivateNote: "These farm details are private to your signed-in CropWise account.", historyEmpty: "Your private scan history will appear here after a signed-in crop scan.", signIn: "Sign in", village: "Village or town", district: "District", state: "State", cancel: "Cancel", overview: "Overview", openMenu: "Open menu", closePanel: "Close panel", changeLocation: "Change farm location", currentLocationActive: "Current location active", workspace: "CropWise workspace", fieldTool: "Field tool", currentLocationPrompt: "Use this device’s current location?", currentLocationPrivacy: "CropWise uses it only in this browser session to tailor the farm-location context. It is not saved to your account.", findingLocation: "Finding current location…", useCurrentLocation: "Use current location", locationUnavailable: "Current location is unavailable. Add your farm location below instead.", addManualLocation: "Add your village, district and state", manualLocationDescription: "Enter the farm location you want CropWise to use in this browser session.", saveFarmLocation: "Save farm location", cropPreferences: "Crop preferences", saving: "Saving…", privateHistorySignIn: "Sign in to keep private crop-scan history.", loadingScans: "Loading your scans…", switchAccount: "Switch account", signInOrSwitch: "Sign in or switch account", signOut: "Sign out", heroTitle: "A better crop starts", heroAccent: "with the field you have.", heroDescription: "Good morning, Ravi. Your soil and the season are pointing toward a strong Kharif start.", seeSoilFit: "See what fits your soil", dailyBrief: "Your daily brief", goodMorning: "Good morning, Ravi", feelsLike: "Feels like", rain: "rain", humidity: "humidity", perQuintal: "per quintal", observed: "Observed", trend30Days: "30 day trend", cropCalendar: "Open crop calendar", recommendationTitle: "What fits your field", soilReport: "View soil report",
  },
  hi: {
    greeting: "आज आपके खेत में", weather: "मौसम की स्थिति", market: "मंडी संकेत", refresh: "लाइव जानकारी ताज़ा करें", farmProfile: "खेत की प्रोफ़ाइल", scanHistory: "स्कैन इतिहास", save: "प्रोफ़ाइल सहेजें", live: "लाइव", unavailable: "अनुपलब्ध", language: "भाषा", chooseLanguage: "भाषा चुनें", myFarm: "मेरा खेत", currentSeason: "वर्तमान मौसम", cropCycle: "फसल चक्र", cropShortlist: "आपकी फसल सूची", weatherLoading: "मौसम की जानकारी लोड हो रही है…", weatherEmpty: "लाइव मौसम देखने के लिए ज़िला जोड़ें।", refreshWeather: "मौसम ताज़ा करें", marketFallback: "आपकी फसल की कीमतें", changeValues: "कीमत बदलें", profilePrivateNote: "खेत की ये जानकारी आपके साइन-इन किए गए CropWise खाते में निजी रहती है।", historyEmpty: "साइन-इन करके फसल स्कैन करने के बाद आपका निजी स्कैन इतिहास यहाँ दिखाई देगा।", signIn: "साइन इन करें", village: "गाँव या कस्बा", district: "ज़िला", state: "राज्य", cancel: "रद्द करें", overview: "सारांश", openMenu: "मेनू खोलें", closePanel: "पैनल बंद करें", changeLocation: "खेत का स्थान बदलें", currentLocationActive: "वर्तमान स्थान सक्रिय", workspace: "CropWise कार्यस्थान", fieldTool: "खेत का उपकरण", currentLocationPrompt: "इस उपकरण का वर्तमान स्थान इस्तेमाल करें?", currentLocationPrivacy: "CropWise इस स्थान का उपयोग केवल इस ब्राउज़र सत्र में खेत का संदर्भ बेहतर बनाने के लिए करता है। यह आपके खाते में सहेजा नहीं जाता।", findingLocation: "वर्तमान स्थान खोज रहे हैं…", useCurrentLocation: "वर्तमान स्थान इस्तेमाल करें", locationUnavailable: "वर्तमान स्थान उपलब्ध नहीं है। नीचे अपने खेत का स्थान जोड़ें।", addManualLocation: "अपना गाँव, ज़िला और राज्य जोड़ें", manualLocationDescription: "वह खेत स्थान दर्ज करें जिसे CropWise इस ब्राउज़र सत्र में उपयोग करे।", saveFarmLocation: "खेत का स्थान सहेजें", cropPreferences: "फसल प्राथमिकताएँ", saving: "सहेज रहे हैं…", privateHistorySignIn: "निजी फसल-स्कैन इतिहास रखने के लिए साइन इन करें।", loadingScans: "आपके स्कैन लोड हो रहे हैं…", switchAccount: "खाता बदलें", signInOrSwitch: "साइन इन करें या खाता बदलें", signOut: "साइन आउट", heroTitle: "बेहतर फसल की शुरुआत", heroAccent: "आपके अपने खेत से होती है।", heroDescription: "सुप्रभात, रवि। आपकी मिट्टी और मौसम मजबूत खरीफ शुरुआत का संकेत दे रहे हैं।", seeSoilFit: "अपनी मिट्टी के अनुकूल फसलें देखें", dailyBrief: "आज की जानकारी", goodMorning: "सुप्रभात, रवि", feelsLike: "महसूस होता है", rain: "बारिश", humidity: "नमी", perQuintal: "प्रति क्विंटल", observed: "देखा गया", trend30Days: "30 दिन का रुझान", cropCalendar: "फसल कैलेंडर खोलें", recommendationTitle: "आपके खेत के लिए क्या सही है", soilReport: "मिट्टी रिपोर्ट देखें",
  },
  mr: {
    greeting: "आज तुमच्या शेतात", weather: "हवामान स्थिती", market: "बाजार संकेत", refresh: "थेट माहिती ताजी करा", farmProfile: "शेत प्रोफाइल", scanHistory: "स्कॅन इतिहास", save: "प्रोफाइल जतन करा", live: "थेट", unavailable: "उपलब्ध नाही", language: "भाषा", chooseLanguage: "भाषा निवडा", myFarm: "माझे शेत", currentSeason: "सध्याचा हंगाम", cropCycle: "पीक चक्र", cropShortlist: "तुमची पीक यादी", weatherLoading: "हवामानाची माहिती लोड होत आहे…", weatherEmpty: "थेट हवामान पाहण्यासाठी जिल्हा जोडा.", refreshWeather: "हवामान ताजे करा", marketFallback: "तुमच्या पिकाच्या किंमती", changeValues: "किंमत बदला", profilePrivateNote: "शेताची ही माहिती तुमच्या साइन-इन केलेल्या CropWise खात्यात खाजगी राहते.", historyEmpty: "साइन-इन करून पीक स्कॅन केल्यानंतर तुमचा खाजगी स्कॅन इतिहास येथे दिसेल.", signIn: "साइन इन करा", village: "गाव किंवा शहर", district: "जिल्हा", state: "राज्य", cancel: "रद्द करा", overview: "आढावा", openMenu: "मेनू उघडा", closePanel: "पटल बंद करा", changeLocation: "शेताचे ठिकाण बदला", currentLocationActive: "सध्याचे स्थान सक्रिय", workspace: "CropWise कार्यक्षेत्र", fieldTool: "शेत साधन", currentLocationPrompt: "या उपकरणाचे सध्याचे स्थान वापरायचे?", currentLocationPrivacy: "CropWise हे स्थान फक्त या ब्राउझर सत्रात शेताचा संदर्भ योग्य करण्यासाठी वापरते. ते तुमच्या खात्यात जतन केले जात नाही.", findingLocation: "सध्याचे स्थान शोधत आहे…", useCurrentLocation: "सध्याचे स्थान वापरा", locationUnavailable: "सध्याचे स्थान उपलब्ध नाही. खाली तुमच्या शेताचे ठिकाण जोडा.", addManualLocation: "तुमचे गाव, जिल्हा आणि राज्य जोडा", manualLocationDescription: "CropWise ने या ब्राउझर सत्रात वापरावे असे शेताचे ठिकाण भरा.", saveFarmLocation: "शेताचे ठिकाण जतन करा", cropPreferences: "पीक प्राधान्ये", saving: "जतन करत आहे…", privateHistorySignIn: "खाजगी पीक-स्कॅन इतिहास ठेवण्यासाठी साइन इन करा.", loadingScans: "तुमचे स्कॅन लोड होत आहेत…", switchAccount: "खाते बदला", signInOrSwitch: "साइन इन करा किंवा खाते बदला", signOut: "साइन आउट", heroTitle: "चांगल्या पिकाची सुरुवात", heroAccent: "तुमच्या शेतापासून होते.", heroDescription: "शुभ सकाळ, रवी. तुमची माती आणि हंगाम मजबूत खरीप सुरुवातीचे संकेत देत आहेत.", seeSoilFit: "तुमच्या मातीला योग्य ते पहा", dailyBrief: "आजचा आढावा", goodMorning: "शुभ सकाळ, रवी", feelsLike: "जाणवते", rain: "पाऊस", humidity: "आर्द्रता", perQuintal: "प्रति क्विंटल", observed: "नोंद", trend30Days: "30 दिवसांचा कल", cropCalendar: "पीक दिनदर्शिका उघडा", recommendationTitle: "तुमच्या शेताला काय योग्य आहे", soilReport: "माती अहवाल पहा",
  },
};
