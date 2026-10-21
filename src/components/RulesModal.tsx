import React from 'react';
import { ROLES, RoleType } from '../game/mafiaRules.ts';
import { X, BookOpen, Shield, Skull, Sun, Moon, Users } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const roleKeys: RoleType[] = [
    'MAFIA_DON',
    'MAFIA',
    'DOCTOR',
    'DETECTIVE',
    'BODYGUARD',
    'CITIZEN',
    'JOKER',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-2xl max-h-[85vh] rounded-2xl p-6 shadow-2xl flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">دليل وقواعد لعبة المافيا العربية</h3>
              <p className="text-xs text-zinc-400">لعبة الخداع، الذكاء، كشف الكذب، وإدارة التحالفات</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق دليل القواعد"
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto space-y-5 text-zinc-300 text-sm pr-1">
          {/* Quick Summary */}
          <div className="bg-gradient-to-r from-red-950/40 via-zinc-900 to-zinc-900 p-4 rounded-xl border border-red-900/40 space-y-2">
            <h4 className="font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-red-500" />
              <span>فكرة اللعبة باختصار (من 3 لاعبين فأكثر):</span>
            </h4>
            <p className="text-xs leading-relaxed text-zinc-300">
              تنقسم البلدة إلى فريقين رئيسيين: <strong className="text-red-400">المافيا</strong> (أقلية خفية تعرف بعضها) و <strong className="text-emerald-400">المواطنون الصالحون</strong> (أغلبية لا تعرف أدوار بعضها ولكن بينهم الدكتور والمحقق).
              تتكرر اللعبة عبر مرحلتين: <strong className="text-indigo-300">مرحلة الليل</strong> و <strong className="text-amber-300">مرحلة النهار</strong> حتى يقضي أحد الفريقين على الآخر!
            </p>
          </div>

          {/* Phases */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-zinc-950/80 p-4 rounded-xl border border-indigo-950/60 space-y-2">
              <div className="flex items-center gap-2 text-indigo-400 font-bold">
                <Moon className="w-4 h-4" />
                <span>1. مرحلة الليل (الظلام)</span>
              </div>
              <ul className="text-xs space-y-1.5 list-disc list-inside text-zinc-400">
                <li>يغمض الجميع أعينهم أو تظهر شاشة الليل.</li>
                <li>تستيقظ المافيا وتختار الضحية التي تريد اغتيالها.</li>
                <li>يستيقظ الطبيب ويختار شخصاً لحمايته وإنقاذه.</li>
                <li>يستيقظ المحقق ويسأل عن هوية أحد اللاعبين.</li>
              </ul>
            </div>

            <div className="bg-zinc-950/80 p-4 rounded-xl border border-amber-950/60 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Sun className="w-4 h-4" />
                <span>2. مرحلة النهار (النقاش والتصويت)</span>
              </div>
              <ul className="text-xs space-y-1.5 list-disc list-inside text-zinc-400">
                <li>يشرق الصباح ويعلن الراوي من قُتل في الليل ومن نجا.</li>
                <li>يبدأ النقاش الحاد بين الجميع (من المشبوه؟ ومن يكذب؟).</li>
                <li>يتم فتح باب التصويت لطرد أو إعدام المتهم الأول.</li>
                <li>إذا حصل المتهم على الأغلبية يُعدم ويكشف أو يبقى سراً.</li>
              </ul>
            </div>
          </div>

          {/* All Roles Breakdown */}
          <div className="space-y-3">
            <h4 className="font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>بطاقات الأدوار وخصائصها:</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {roleKeys.map(key => {
                const r = ROLES[key];
                return (
                  <div
                    key={key}
                    className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{r.nameAr}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        r.team === 'MAFIA' ? 'bg-red-950 text-red-400 border border-red-800' :
                        r.team === 'CITIZENS' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                        'bg-purple-950 text-purple-400 border border-purple-800'
                      }`}>
                        {r.team === 'MAFIA' ? 'مافيا' : r.team === 'CITIZENS' ? 'مواطن' : 'مستقل'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{r.descriptionAr}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Winning Conditions */}
          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
            <h4 className="font-bold text-white flex items-center gap-2">
              <Skull className="w-4 h-4 text-red-400" />
              <span>كيف تفوز في اللعبة؟</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-900/40">
                <span className="font-bold text-emerald-400">فوز المواطنين:</span>
                <p className="mt-1 text-zinc-300">طرد وإعدام جميع أعضاء المافيا عبر التصويت أو القناص.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-red-950/20 border border-red-900/40">
                <span className="font-bold text-red-400">فوز المافيا:</span>
                <p className="mt-1 text-zinc-300">عندما يتساوى عدد المافيا مع عدد المواطنين الأحياء.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-sm shadow-md transition-all"
          >
            فهمت، لنبدأ اللعب!
          </button>
        </div>
      </div>
    </div>
  );
};
