import { useState } from "react";
import { Link } from "wouter";
import { startLogin } from "@/const";
import { useLanguage } from "@/contexts/LanguageContext";

const copy = {
  en: { eyebrow: "Secure sign-in", title: "That sign-in did not finish", body: "The secure login handoff expired or was interrupted. Start a fresh attempt; your farm data is unchanged.", retry: "Try Google again", wait: "Opening secure sign-in…", email: "Use email and password instead", home: "Return to dashboard" },
  hi: { eyebrow: "सुरक्षित साइन-इन", title: "साइन-इन पूरा नहीं हुआ", body: "सुरक्षित लॉगिन प्रक्रिया समाप्त या बाधित हो गई। नया प्रयास शुरू करें; आपके खेत का डेटा सुरक्षित है।", retry: "Google फिर से आज़माएँ", wait: "सुरक्षित साइन-इन खुल रहा है…", email: "इसके बजाय ईमेल और पासवर्ड उपयोग करें", home: "डैशबोर्ड पर लौटें" },
  mr: { eyebrow: "सुरक्षित साइन-इन", title: "साइन-इन पूर्ण झाले नाही", body: "सुरक्षित लॉगिन प्रक्रिया कालबाह्य झाली किंवा थांबली. नवीन प्रयत्न करा; तुमचा शेत डेटा सुरक्षित आहे.", retry: "Google पुन्हा प्रयत्न करा", wait: "सुरक्षित साइन-इन उघडत आहे…", email: "त्याऐवजी ईमेल आणि पासवर्ड वापरा", home: "डॅशबोर्डवर परत जा" },
} as const;

export default function AuthRetry() {
  const { language } = useLanguage();
  const text = copy[language];
  const [loading, setLoading] = useState(false);
  return <main className="grid min-h-screen place-items-center bg-[#f5f1e8] px-4 text-[#1d2d29]"><section className="w-full max-w-lg rounded-[2rem] bg-[#fffdf8] p-8 text-center shadow-[0_24px_70px_rgba(43,55,49,0.14)] md:p-12"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f5e4c1] text-2xl">↻</div><p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-[#a66a2c]">{text.eyebrow}</p><h1 className="mt-3 font-serif text-4xl leading-tight">{text.title}</h1><p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#65736c]">{text.body}</p><button disabled={loading} onClick={() => { setLoading(true); startLogin(); }} className="mt-8 w-full rounded-xl bg-[#31564b] px-4 py-3.5 font-semibold text-white disabled:opacity-60">{loading ? text.wait : text.retry}</button><Link href="/sign-in" className="mt-5 inline-block text-sm font-medium text-[#31564b] hover:underline">{text.email}</Link><div><Link href="/dashboard" className="mt-7 inline-block text-xs text-[#7d887f] hover:underline">{text.home}</Link></div></section></main>;
}
