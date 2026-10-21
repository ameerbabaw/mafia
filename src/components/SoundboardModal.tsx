import React from 'react';
import { sound } from '../utils/audioEngine.ts';
import { X, Volume2, Mic, Heart, ShieldAlert, Cross, Bell, Sun, Moon, Clock } from 'lucide-react';

interface SoundboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SoundboardModal: React.FC<SoundboardModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const playVoice = (text: string) => {
    sound.speakArabic(text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600/20 text-red-500 border border-red-500/30">
              <Volume2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">لوحة المؤثرات الصوتية والراوي</h3>
              <p className="text-xs text-zinc-400">تحكم كامل بالأجواء السينمائية وصوت الراوي الآلي</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق لوحة المؤثرات"
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SFX Buttons */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-red-400" />
            <span>مؤثرات حية درامية</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              onClick={() => sound.playGunshot()}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-red-500 hover:bg-red-950/20 text-zinc-200 transition-all active:scale-95"
            >
              <span className="text-xl mb-1">💥</span>
              <span className="text-xs font-bold">طلقة رصاص</span>
            </button>
            <button
              onClick={() => sound.playGavel()}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-amber-500 hover:bg-amber-950/20 text-zinc-200 transition-all active:scale-95"
            >
              <span className="text-xl mb-1">🔨</span>
              <span className="text-xs font-bold">مطرقة الحكم</span>
            </button>
            <button
              onClick={() => sound.playHeartbeat()}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-rose-500 hover:bg-rose-950/20 text-zinc-200 transition-all active:scale-95"
            >
              <Heart className="w-5 h-5 text-rose-500 mb-1" />
              <span className="text-xs font-bold">نبضات رعب</span>
            </button>
            <button
              onClick={() => sound.playTicking()}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-blue-500 hover:bg-blue-950/20 text-zinc-200 transition-all active:scale-95"
            >
              <Clock className="w-5 h-5 text-blue-400 mb-1" />
              <span className="text-xs font-bold">تكتكة الساعة</span>
            </button>
            <button
              onClick={() => sound.playDetectiveInspection()}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-blue-500 hover:bg-blue-950/20 text-zinc-200 transition-all active:scale-95"
            >
              <ShieldAlert className="w-5 h-5 text-blue-400 mb-1" />
              <span className="text-xs font-bold">تحري الشرطة</span>
            </button>
            <button
              onClick={() => sound.playDoctorHeal()}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500 hover:bg-emerald-950/20 text-zinc-200 transition-all active:scale-95"
            >
              <Cross className="w-5 h-5 text-emerald-400 mb-1" />
              <span className="text-xs font-bold">شفاء الطبيب</span>
            </button>
            <button
              onClick={() => sound.playNightFall()}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-indigo-500 hover:bg-indigo-950/20 text-zinc-200 transition-all active:scale-95"
            >
              <Moon className="w-5 h-5 text-indigo-400 mb-1" />
              <span className="text-xs font-bold">حلول الليل</span>
            </button>
            <button
              onClick={() => sound.playDawn()}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-yellow-500 hover:bg-yellow-950/20 text-zinc-200 transition-all active:scale-95"
            >
              <Sun className="w-5 h-5 text-yellow-400 mb-1" />
              <span className="text-xs font-bold">أشرق الصباح</span>
            </button>
          </div>
        </div>

        {/* Arabic Voice Narration Buttons */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
            <span>صوت الراوي الآلي (نطق عربي)</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => playVoice('أيها المواطنون الكرام، حل الليل على البلدة، أغمضوا أعينكم الآن جميعاً!')}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-600 text-right text-xs text-zinc-200 transition-all active:scale-98"
            >
              <Moon className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="truncate">"أغمضوا أعينكم جميعاً..."</span>
            </button>
            <button
              onClick={() => playVoice('المافيا تستيقظ الآن بصمت وتختار ضحيتها.')}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-red-600 text-right text-xs text-zinc-200 transition-all active:scale-98"
            >
              <span className="shrink-0">🩸</span>
              <span className="truncate">"المافيا تستيقظ وتختار ضحيتها"</span>
            </button>
            <button
              onClick={() => playVoice('الطبيب يستيقظ الآن ليختار شخصاً واحداً لحمايته.')}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-emerald-600 text-right text-xs text-zinc-200 transition-all active:scale-98"
            >
              <Cross className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">"الطبيب يستيقظ للحماية"</span>
            </button>
            <button
              onClick={() => playVoice('المحقق يستيقظ الآن ويشير إلى الشخص المشتبه به.')}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-blue-600 text-right text-xs text-zinc-200 transition-all active:scale-98"
            >
              <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="truncate">"المحقق يستيقظ للتحري"</span>
            </button>
            <button
              onClick={() => playVoice('أشرق الصباح واستيقظ الجميع... لنرى ماذا حدث في هذه الليلة!')}
              className="col-span-1 sm:col-span-2 flex items-center justify-center gap-2 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-amber-500 text-xs font-bold text-amber-300 transition-all active:scale-98"
            >
              <Sun className="w-4 h-4 text-amber-400" />
              <span>"أشرق الصباح، استيقظوا جميعاً!"</span>
            </button>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm transition-all"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
