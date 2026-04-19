import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, Timestamp, where, deleteDoc, doc } from 'firebase/firestore';
import HBDIChart from './HBDIChart';
import { motion, AnimatePresence } from 'motion/react';
import { User, Calendar, Brain, Search, List, Trash2 } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { cn } from '../lib/utils';

interface ResponseData {
  id: string;
  teacherName: string;
  teacherEmail: string;
  scores: {
    A: number;
    B: number;
    C: number;
    D: number;
  };
  answers: Record<string, number>;
  createdAt: Timestamp;
}

const AdminPanel: React.FC = () => {
  const [responses, setResponses] = useState<ResponseData[]>([]);
  const [selectedResponse, setSelectedResponse] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'responses'), 
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<ResponseData, 'id'>),
      }));
      setResponses(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredResponses = responses.filter((r) =>
    r.teacherName.toLowerCase().includes(search.toLowerCase())
  );

  const handleDeleteResponse = async (e: React.MouseEvent, responseId: string) => {
    e.stopPropagation(); // Prevent selecting the card when clicking delete
    
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذه الاستجابة؟ لا يمكن التراجع عن هذا الإجراء.')) {
      try {
        await deleteDoc(doc(db, 'responses', responseId));
        if (selectedResponse?.id === responseId) {
          setSelectedResponse(null);
        }
      } catch (error) {
        console.error('Error deleting document:', error);
        alert('حدث خطأ أثناء محاولة الحذف.');
      }
    }
  };

  const getDominantQuadrant = (scores: ResponseData['scores']) => {
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    return sorted[0][0]; // Returns A, B, C, or D
  };

  const getQuadrantLabel = (q: string) => {
    switch (q) {
      case 'A': return 'النمط (A) - تحليلي/موضوعي';
      case 'B': return 'النمط (B) - تنفيذي/إجرائي';
      case 'C': return 'النمط (C) - مشاعري/تواصلي';
      case 'D': return 'النمط (D) - إبداعي/استراتيجي';
      default: return '';
    }
  };

  const quadrantDetails = {
    A: {
      title: 'النمط (A) - تحليلي/موضوعي (يسار أعلى)',
      features: 'يهتم بالحقائق، الأرقام، التحليل المنطقي، والدراسات الدقيقة.',
      traits: ['عقلاني', 'واقعي', 'يفكر جيداً قبل التصرف', 'متحفظ'],
      strengths: ['حل المشكلات المعقدة', 'التحليل المنطقي العميق', 'الدقة المتناهية في الحسابات', 'اتخاذ قرارات مبنية على الحقائق'],
      weaknesses: ['قد يبدو بارداً أو غير عاطفي', 'التركيز المفرط على الأرقام وإهمال الجانب الإنساني', 'صعوبة في التعامل مع المواقف الغامضة'],
      keywords: 'أرقام، حقائق، منطق، تحليل، كفاءة، نتائج، دقة، أهداف ملموسة.',
      dealing: 'تحدث بلغة الأرقام والحقائق، تجنب العاطفة المفرطة في الحوار المهني، قدم أدلة وبراهين واضحة، وكن مباشراً وموضوعياً في طلباتك.',
      reinforcement: 'التقدير المبني على الإنجاز الرقمي والنتائج الملموسة، الثناء على مهارته التحليلية والدقة، وتوفير مصادر بيانات ومراجع قوية له.',
    },
    B: {
      title: 'النمط (B) - تنفيذي/إجرائي (يسار أسفل)',
      features: 'يركز على التخطيط، الإجراءات، التنفيذ، والالتزام بالوقت.',
      traits: ['دقيق', 'منظم', 'عملي', 'روتيني', 'منضبط'],
      strengths: ['التنظيم الفائق', 'الالتزام الصارم بالمواعيد', 'تحويل الخطط إلى واقع ملموس', 'تطبيق اللوائح والأنظمة بدقة'],
      weaknesses: ['المقاومة الشديدة للتغيير المفاجئ', 'التمسك المفرط بالروتين', 'الارتباك عند غياب التعليمات الواضحة'],
      keywords: 'تنظيم، خطة، خطوات، ترتيب، انضباط، أمان، إجراءات، روتين.',
      dealing: 'التزم بالمواعيد بدقة، قدم تعليمات مكتوبة وواضحة، احترم النظام المدرسي، وتجنب التغييرات المفاجئة في الجدول الدراسي.',
      reinforcement: 'الثناء على دقة التنظيم والانضباط، منحه مسؤوليات إدارية تتطلب دقة، والتقدير العالي لالتزامه باللوائح والخطط الزمنية.',
    },
    C: {
      title: 'النمط (C) - مشاعري/تواصلي (يمين أسفل)',
      features: 'يركز على العلاقات مع الآخرين، المشاعر، والتعبير.',
      traits: ['عاطفي', 'اجتماعي', 'حساس', 'متعاون'],
      strengths: ['بناء علاقات إيجابية قوية', 'العمل الجماعي وروح الفريق', 'فهم مشاعر واحتياجات الآخرين', 'التحفيز المعنوي للزملاء والطلاب'],
      weaknesses: ['تأثره الشديد بالانتقادات الشخصية', 'صعوبة في اتخاذ قرارات حازمة قد تزعج الآخرين', 'التركيز على المشاعر أكثر من النتائج أحياناً'],
      keywords: 'مشاعر، تشجيع، فريق، مشاركة، دعم، تعاون، علاقات، تواصل.',
      dealing: 'استخدم نبرة صوت ودودة، اهتم بالجانب الإنساني والاجتماعي، ركز على العمل الجماعي، وقدم التغذية الراجعة بشكل شخصي ولطيف.',
      reinforcement: 'الكلمات التحفيزية العلنية، شهادات التقدير المعنوية، تعزيز روح الفريق، وتوفير بيئة عمل يسودها الود والتفاعل الاجتماعي.',
    },
    D: {
      title: 'النمط (D) - إبداعي/استراتيجي (يمين أعلى)',
      features: 'يهتم بالتخيل، النظرة الشمولية، والابتكار.',
      traits: ['مبدع', 'مبادر', 'رؤية مستقبلية', 'مغامر'],
      strengths: ['التفكير خارج الصندوق', 'الرؤية الاستراتيجية البعيدة', 'القدرة على الابتكار وإيجاد حلول غير تقليدية', 'المرونة العالية في التعامل مع التغيير'],
      weaknesses: ['إهمال التفاصيل الدقيقة والروتينية', 'القفز من فكرة لأخرى قبل إتمام الأولى', 'صعوبة في الالتزام بالخطط الزمنية الصارمة'],
      keywords: 'إبداع، ابتكار، رؤية، تجربة، حرية، مرونة، مشاريع، تغيير.',
      dealing: 'أعطه مساحة واسعة للإبداع، شجع أفكاره الجريئة وغير التقليدية، ركز على الأهداف الكبرى والنتائج النهائية، ولا تقيده بالتفاصيل الروتينية المملة.',
      reinforcement: 'منحه الحرية في تصميم وتطوير طرق التدريس، التقدير العلني لأفكاره المبتكرة، وتكليفه بقيادة مشاريع تطويرية تجريبية.',
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">لوحة تحكم المحلل</h1>
          <p className="text-slate-500">متابعة استمارات المعلمين وتحليل اللقطات الدماغية.</p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="بحث باسم المعلم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Submissions List */}
        <div className="lg:col-span-1 space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          <div className="flex items-center gap-2 mb-4 sticky top-0 bg-slate-50 py-2">
            <List className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-slate-700">قائمة المستجيبين ({filteredResponses.length})</h2>
          </div>
          
          <AnimatePresence>
            {filteredResponses.length > 0 ? (
              filteredResponses.map((res) => (
                <motion.div
                  key={res.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedResponse(res)}
                  className={cn(
                    "p-5 rounded-2xl border cursor-pointer transition-all duration-200 hover:shadow-md",
                    selectedResponse?.id === res.id
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-white border-slate-100 hover:border-indigo-200"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-lg">{res.teacherName}</h3>
                      <div className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase w-fit",
                        selectedResponse?.id === res.id ? "bg-white/20" : "bg-blue-50 text-accent-bento"
                      )}>
                        {getQuadrantLabel(getDominantQuadrant(res.scores))}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteResponse(e, res.id)}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        selectedResponse?.id === res.id
                          ? "text-white/60 hover:text-white hover:bg-white/10"
                          : "text-slate-300 hover:text-rose-600 hover:bg-rose-50"
                      )}
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-4 text-xs opacity-80">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {res.createdAt?.toDate().toLocaleDateString('ar-EG')}
                    </span>
                    {res.teacherEmail && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {res.teacherEmail}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                لا يوجد نتائج تطابق بحثك
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Detailed Analysis */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedResponse ? (
              <motion.div
                key={selectedResponse.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="grid grid-cols-12 grid-rows-8 gap-4 min-h-[700px]"
              >
                {/* Teacher Info Card */}
                <div className="bento-card col-span-12 xl:col-span-4 xl:row-span-3">
                  <div className="bento-title">بيانات المعلم</div>
                  <div className="space-y-3 mt-2">
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-[13px] text-text-secondary">اسم المعلم:</span>
                      <span className="text-[14px] font-bold">{selectedResponse.teacherName}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-[13px] text-text-secondary">تاريخ التعبئة:</span>
                      <span className="text-[14px] font-bold">{selectedResponse.createdAt?.toDate().toLocaleDateString('ar-EG')}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-[13px] text-text-secondary">البريد:</span>
                      <span className="text-[14px] font-bold">{selectedResponse.teacherEmail || 'غير متوفر'}</span>
                    </div>
                  </div>
                </div>

                {/* Main Chart Card */}
                <div className="bento-card col-span-12 xl:col-span-5 xl:row-span-8 flex items-center justify-center relative">
                  <div className="bento-title absolute top-5 right-5">اللقطة الدماغية (Brain Shot)</div>
                  <div className="w-full flex items-center justify-center mt-8">
                    <HBDIChart scores={selectedResponse.scores} />
                  </div>
                </div>

                {/* Scores Card */}
                <div className="bento-card col-span-12 xl:col-span-3 xl:row-span-4">
                  <div className="bento-title">درجات الهيمنة</div>
                  <div className="space-y-4 mt-2">
                    {[
                      { id: 'A', label: 'تحليلي (A)', value: selectedResponse.scores.A, color: 'bg-[#2D5DA1]' },
                      { id: 'B', label: 'تنفيذي (B)', value: selectedResponse.scores.B, color: 'bg-[#4DA650]' },
                      { id: 'C', label: 'تفاعلي (C)', value: selectedResponse.scores.C, color: 'bg-[#E53935]' },
                      { id: 'D', label: 'ابتكاري (D)', value: selectedResponse.scores.D, color: 'bg-[#FBC02D]' },
                    ].map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <span className="text-[12px] font-bold w-16 text-text-secondary">{item.label}</span>
                        <div className="flex-grow h-3 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${item.value}%` }}
                            className={cn("h-full", item.color)}
                          />
                        </div>
                        <span className="text-[13px] font-bold w-8 text-left">{Math.round(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Traits Card */}
                <div className="bento-card col-span-12 xl:col-span-4 xl:row-span-5 overflow-y-auto">
                  <div className="bento-title">السمات السلوكية لنمط {getDominantQuadrant(selectedResponse.scores)}</div>
                  <div className="space-y-4 mt-2">
                    <div className="flex flex-wrap gap-2">
                      {quadrantDetails[getDominantQuadrant(selectedResponse.scores) as 'A'|'B'|'C'|'D'].traits.map((trait) => (
                        <span key={trait} className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-[8px] text-[13px] font-medium border border-blue-100">
                          {trait}
                        </span>
                      ))}
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-[12px] font-bold text-green-700 mb-1 flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          نقاط القوة:
                        </p>
                        <ul className="list-disc list-inside text-[13px] text-slate-600 space-y-1 pr-1">
                          {(quadrantDetails[getDominantQuadrant(selectedResponse.scores) as 'A'|'B'|'C'|'D'] as any).strengths.map((s: string) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="text-[12px] font-bold text-rose-700 mb-1 flex items-center gap-1">
                          <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                          نقاط الضعف المحتملة:
                        </p>
                        <ul className="list-disc list-inside text-[13px] text-slate-600 space-y-1 pr-1">
                          {(quadrantDetails[getDominantQuadrant(selectedResponse.scores) as 'A'|'B'|'C'|'D'] as any).weaknesses.map((w: string) => (
                            <li key={w}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-50">
                      <p className="text-[12px] font-bold text-text-secondary mb-1">الخصائص الرئيسية:</p>
                      <p className="text-[13px] text-text-secondary leading-relaxed">
                        {quadrantDetails[getDominantQuadrant(selectedResponse.scores) as 'A'|'B'|'C'|'D'].features}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notes Card - Analysis */}
                <div className="bento-card col-span-12 xl:col-span-8 xl:row-span-4">
                  <div className="bento-title">تحليل النمط السائد والكلمات المفتاحية</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                    <div className="bg-[#fffaf0] p-4 rounded-[8px] border-r-4 border-[#ed8936] text-[14px]">
                      <p className="font-bold text-slate-900 mb-2">التحليل الفني:</p>
                      <p className="text-text-secondary leading-relaxed">
                        {selectedResponse.scores[getDominantQuadrant(selectedResponse.scores) as 'A'|'B'|'C'|'D'] > 75 ? (
                          `يظهر المعلم هيمنة شديدة في ${quadrantDetails[getDominantQuadrant(selectedResponse.scores) as 'A'|'B'|'C'|'D'].title}. يتميز هذا الشخص بأنه ${quadrantDetails[getDominantQuadrant(selectedResponse.scores) as 'A'|'B'|'C'|'D'].traits.join('، ')}.`
                        ) : (
                          `يظهر المعلم ميلاً واضحاً نحو ${quadrantDetails[getDominantQuadrant(selectedResponse.scores) as 'A'|'B'|'C'|'D'].title} مع توازن في الأنماط الأخرى.`
                        )}
                      </p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-[8px] border-r-4 border-accent-bento text-[14px]">
                      <p className="font-bold text-slate-900 mb-2">الكلمات المفتاحية للحوار:</p>
                      <p className="text-blue-900 font-medium leading-relaxed italic">
                        {quadrantDetails[getDominantQuadrant(selectedResponse.scores) as 'A'|'B'|'C'|'D'].keywords}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Strategy Cards */}
                <div className="bento-card col-span-12 xl:col-span-6 xl:row-span-4 overflow-hidden">
                  <div className="bento-title">كيفية التعامل مع المعلم</div>
                  <div className="bg-slate-50 p-4 rounded-[8px] border border-slate-200 h-full overflow-y-auto">
                    <p className="text-[14px] text-slate-700 leading-relaxed">
                      {quadrantDetails[getDominantQuadrant(selectedResponse.scores) as 'A'|'B'|'C'|'D'].dealing}
                    </p>
                  </div>
                </div>

                <div className="bento-card col-span-12 xl:col-span-6 xl:row-span-4 overflow-hidden">
                  <div className="bento-title">التعزيز والتحفيز المناسب</div>
                  <div className="bg-green-50 p-4 rounded-[8px] border border-green-100 h-full overflow-y-auto">
                    <p className="text-[14px] text-green-800 leading-relaxed">
                      {quadrantDetails[getDominantQuadrant(selectedResponse.scores) as 'A'|'B'|'C'|'D'].reinforcement}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200 p-12 min-h-[400px]">
                <Brain className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-xl">يرجى اختيار معلم من القائمة لمشاهدة التحليل</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
