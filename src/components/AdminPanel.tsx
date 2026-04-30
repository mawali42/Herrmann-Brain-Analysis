import React, { useEffect, useState, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, Timestamp, where, deleteDoc, doc } from 'firebase/firestore';
import HBDIChart from './HBDIChart';
import { motion, AnimatePresence } from 'motion/react';
import { User, Calendar, Brain, Search, List, Trash2, Download, Loader2, Printer, FileText, BarChart3, CheckSquare } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { cn } from '../lib/utils';
import jsPDF from 'jspdf';
import * as htmlToImage from 'html-to-image';
import { questions } from '../data/questions';

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
  const [viewType, setViewType] = useState<'analysis' | 'form'>('analysis');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [oscarMode, setOscarMode] = useState<'specific' | 'general'>('specific');
  const reportRef = useRef<HTMLDivElement>(null);

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
    e.stopPropagation();
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذه الاستجابة؟ لا يمكن التراجع عن هذا الإجراء.')) {
      try {
        await deleteDoc(doc(db, 'responses', responseId));
        if (selectedResponse?.id === responseId) {
          setSelectedResponse(null);
        }
      } catch (error) {
        console.error('Error deleting document:', error);
      }
    }
  };

  const getDominantQuadrant = (scores: ResponseData['scores']) => {
    const sorted = Object.entries(scores).sort((a, b) => (b[1] as number) - (a[1] as number));
    return sorted[0][0]; 
  };

  const quadrantBriefs: Record<string, string> = {
    A: 'تحليلي، منطقي، واقعي، ويهتم بالأرقام والحقائق.',
    B: 'تنفيذي، منظم، دقيق، ويهتم بالتنفيذ والإجراءات والوقت.',
    C: 'مشاعري، اجتماعي، حساس، ويهتم بالعلاقات والتواصل الإنساني.',
    D: 'إبداعي، ابتكاري، شمولي، ويهتم بالرؤية المستقبلية والأفكار الجريئة.',
  };

  const oscarQuestions: Record<string, { o: string[]; s: string[]; c: string[]; a: string[]; r: string[] }> = {
    GENERAL: {
      o: ['ما الذي تريد تحقيقه؟', 'ما الشيء المهم لك الآن؟', 'ما الذي تريد ان تحصل عليه خلال هذا الوقت المتاح لنا؟', 'ما الجوانب التي تريد تغطيتها؟', 'صف عالمك المثالي.', 'ما الذي تريد تحقيقه نتيجة لهذه الجلسة؟', 'ما الذي سيجعلك تشعر بأن هذا الوقت كان مثمر بالنسبة لك؟'],
      s: ['أين أنت الآن بالنسبة لهدفك؟', 'على ميزان 1-10 أين أنت الآن؟', 'ما الذي ساهم في نجاحك الى الآن؟', 'ما المهارات، المعارف والمساهمات التي تمتلكها؟', 'ما التقدم الذي أحرزته إلى الآن؟', 'ما المطلوب منك الآن؟'],
      c: ['ما الخيارات الموجودة لديك؟', 'كيف استطعت التعامل مع موقف مشابه في الماضي؟', 'ما الذي تستطيع عمله بطريقة مختلفة؟', 'هل تعرف شخصاً تعامل مع نفس الموقف؟', 'أعطني ثلاثة خيارات.', 'إذا كان هناك شيء من الممكن القيام به فما هو؟', 'ماذا أيضاً؟', 'ما نتائج هذه الخيارات؟', 'ماذا ستفعل لو علمت أن هناك آثار سلبية لهذه الخيارات؟'],
      a: ['ما الخيار الأفضل بالنسبة لك؟', 'ما الخطوة الصغيرة التي ستقوم بها الآن؟', 'ما الإجراءات التي ستتخذها؟', 'متى ستبدأ؟', 'من سيساعدك؟', 'كيف ستعرف أنك ناجح؟', 'كيف ستضمن أنك تقوم به؟', 'على ميزان 1-10 ما مدى التزامك ودافعيتك للقيام بهذا العمل؟'],
      r: ['كيف ستتابع التقدم في عملك؟', 'كيف ستقيس أثر نجاحك؟', 'كيف ستعرف انك على الطريق الصحيح؟'],
    },
    A: {
      o: ['ما المخرج النهائي (الهدف الرئيسي) الذي كنت تريد تحقيقه مع الطلبة؟', 'كم النسبة التي تمنحها نفسك في تحقيق الهدف؟', 'كم الوقت الذي تعتقد أن هذا الهدف سيحتاج ليتحقق مع الطلبة؟'],
      s: ['عدد الإجراءات التي اتخذتها لتحقق هذا الهدف؟', 'على ميزان 1-10 أين أنت الآن؟', 'ما النسبة التي تمنحها نفسك على الإجراءات التي اتخذتها لتحقق هذا الهدف؟', 'حدد وبدقة النشاط الذي تعتقد انه عرقل تحقيق الهدف.', 'اذن حدد وبدقة ماذا كانت المشكلة.'],
      c: ['ما الخيارات الموجودة لديك؟', 'كيف استطعت التعامل مع موقف مشابه في الماضي؟', 'ما الذي تستطيع عمله بطريقة مختلفة؟', 'أعطني ثلاثة خيارات.', 'إذا كان هناك شيء من الممكن القيام به فما هو؟', 'ما نتائج هذه الخيارات؟', 'ماذا ستفعل لو علمت أن هناك آثار سلبية لهذه الخيارات؟'],
      a: ['ما الخيار الأفضل بالنسبة لك؟', 'ما الخطوة الصغيرة التي ستقوم بها الآن؟', 'ما الإجراءات التي ستتخذها؟', 'متى ستبدأ؟', 'من سيساعدك؟', 'كيف ستعرف أنك ناجح؟', 'على ميزان 1-10 ما مدى التزامك ودافعيتك للقيام بهذا العمل؟'],
      r: ['كيف ستتابع التقدم في عملك؟', 'كيف ستقيس أثر نجاحك؟', 'كيف ستعرف انك على الطريق الصحيح؟'],
    },
    B: {
      o: ['ما الذي تقوم به عادة لتحقيق أهدافك؟', 'اذكر أهداف من هذه الحصة بالتسلسل المنطقي.', 'ما الذي خططت لتنفيذه في هذا الوقت المتاح؟'],
      s: ['اكتب في هذه الورقة تسلسل الإجراءات التي قمت بها واقعياً في الحصة لتحقيق هدفك.', 'قم بعمل قائمة بالمهارات التي تمتلكها وساعدت على نجاح الإجراءات وأخرى تعتقد انك تحتاج اليها؟', 'ما الذي كنت تقوم به سابقا واختلف اليوم في هذه الحصة؟', 'ما الوسائل التي ساعدتك على تحقيق هدفك وأخرى تشعر انك تحتاجها؟'],
      c: ['ضع قائمة بالخيارات التي تعتقد انها ستساعدك في حل المشكلة؟', 'كيف استطعت التعامل مع موقف مشابه في الماضي؟', 'حدد لي ما الخيارات الأنسب لك؟', 'اكتب لكل خيار النتيجة المتوقعة له.', 'ما الوسائل التنفيذية التي تستطيع ان تساعد بها زميلاً يواجه نفس الموقف؟'],
      a: ['ضع خطاً تحت الخيار الأنسب لك.', 'ضع خطة تفصيلية توضح فيها الإجراءات التي ستقوم بها لتنفيذ الخيار.', 'حدد تاريخ البداية وتاريخ زيارتي القادمة.', 'ماذا تحتاج مني حتى تسير الخطة بشكل آمن ومريح؟'],
      r: ['صمم خطة للمتابعة.', 'صمم استمارات تساعدك على تتبع نجاح الخطة.'],
    },
    C: {
      o: ['ما شعورك تجاه هدفك في هذه الحصة؟', 'ما الذي يجعلك تشعر انك حققته؟ وما الذي يجعلك تشعر انك لم تحققه؟', 'هل تعتقد انك لو خططت للحصة مع زميل لكان أداؤك أفضل؟', 'هل تعتقد أن لغة الجسد التي وظفتها ساعدت على فهم الطلاب للهدف؟'],
      s: ['ما شعورك تجاه الأنشطة التي قدمتها في حصتك؟', 'أيها تعتقد انه كان سبب نجاح الخطة؟ وأيها تعتقد أنه لم يمض كما خططت له؟', 'ما المهارات التي تود أن تكتسبها من زملائك الذين يدرسون نفس الصف؟', 'كيف كان شعورك عندما سألك الطالب عن ...؟'],
      c: ['تحدث عن الخيارات التي تحبها وتعتقد انها ستحقق هدفك بشكل أفضل.', 'ماذا عن فكرة التدريس التعاوني، هل تعتقد انها ستساعدك؟', 'ماذا عن التواصل مع أولياء الأمور لمساعدتك في رفع مستوى تفاعلهم؟', 'هل تعتقد أن تمثيل الأدوار فكرة جيدة يمكن البدء بها؟'],
      a: ['أي الخيارات أحببته أكثر؟ ولماذا؟', 'تحدث عن الخطة التي ستنفذها من الآن إلى موعد زيارتي القادم.', 'متى تحب ان أزورك؟', 'حدثني عن شعورك حين تعتقد انك تمكنت من تنفيذ خطتك.', 'من تحب أن يتعاون معك من زملائك؟'],
      r: ['ما رأيك لو طلبنا من المدير مساعدتك في متابعة الخطة؟', 'بماذا تحب أن نعززك بعد نجاح الخطة؟'],
    },
    D: {
      o: ['ارسم لي هدف حصتك.. ما المميز في هذه الرسمة؟', 'هل تشعر انك نفذتها بنفس تفاصيل الصورة؟', 'صف الهدف المثالي الذي كنت تستطيع تحقيقه.'],
      s: ['ارسم storyboard توضح فيه مجريات الحصة.', 'ضع دائرة على الموقف أو النشاط الأكثر نجاحاً.', 'ضع دائرة على النشاط الذي استغرق وقتاً أكبر ولم يمض كما خططت له.', 'ما رأيك ان تضع ساعة زمنية لكل نشاط توضح الوقت المستغرق؟'],
      c: ['ارسم مجموعة أسهم توضح بدائلك المبتكرة.', 'اربط بين هذا الموقف وموقف مشابه في الماضي، ما العلاقة بينهما؟', 'قم بعمل خارطة ذهنية توضح كل بديل والوسائل والمعينات التي ستساعدك.'],
      a: ['ادمج مهاراتك ومعارفك مع البديل الأنسب، وحدد الخطوة التالية.', 'قم بعمل عصف ذهني لهذا البديل توضح فيه خطتك القادمة.', 'من تحب أن يجعلك أكثر التزاماً بتنفيذ الخطة؟', 'ما الشيء المميز الذي سأراه في زيارتي القادمة؟'],
      r: ['ارسم سلماً متدرجاً يوضح خطتك في متابعة العمل.', 'هل تعتقد ان عرض نجاحات الخطة على مواقع التواصل الاجتماعي سيكون حافزاً لك؟', 'هل لديك تصور آخر مختلف يساعدني على متابعتك ومساعدتك؟'],
    },
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

  const quadrantDetails: Record<string, any> = {
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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current || !selectedResponse) return;
    
    setExporting(true);
    try {
      // Ensure element is ready and visible
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const element = reportRef.current;
      
      // Use htmlToImage which is better with SVGs and complex CSS
      const dataUrl = await htmlToImage.toPng(element, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        width: element.offsetWidth,
        height: element.offsetHeight,
      });

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: [element.offsetWidth, element.offsetHeight],
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${viewType === 'analysis' ? 'تحليل' : 'استمارة'}_هيرمان_${selectedResponse.teacherName}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('نعتذر، حدث خطأ تقني في إنشاء الملف. يمكنك تجربة تصغير نافذة المتصفح أو المحاولة من جهاز كمبيوتر لضمان أفضل توافق.');
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
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
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-3xl font-bold text-slate-900 mb-2">لوحة تحكم المحلل</h1>
          <p className="text-slate-500">متابعة استمارات المعلمين وتحليل اللقطات الدماغية.</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative w-full md:w-80"
        >
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="بحث باسم المعلم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </motion.div>
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
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "p-5 rounded-2xl border cursor-pointer transition-all duration-200 hover:shadow-md group",
                    selectedResponse?.id === res.id
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-white border-slate-100 hover:border-indigo-200"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-lg">{res.teacherName}</h3>
                      <div className="relative group/tooltip w-fit">
                        <div className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase w-fit transition-colors",
                          selectedResponse?.id === res.id ? "bg-white/20" : "bg-blue-50 text-accent-bento"
                        )}>
                          {getQuadrantLabel(getDominantQuadrant(res.scores))}
                        </div>
                        
                        {/* Tooltip */}
                        <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 shadow-xl pointer-events-none border border-white/10 leading-relaxed">
                          {quadrantBriefs[getDominantQuadrant(res.scores)]}
                          {/* Tooltip Arrow */}
                          <div className="absolute top-full right-4 -mt-1 border-4 border-transparent border-t-slate-900" />
                        </div>
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

        {/* Detailed Analysis / Form Header Toggle */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedResponse ? (
              <div className="space-y-6">
                <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit mb-4">
                  <button
                    onClick={() => setViewType('analysis')}
                    className={cn(
                      "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                      viewType === 'analysis'
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                        : "text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    <BarChart3 className="w-4 h-4" />
                    تحليل النتائج
                  </button>
                  <button
                    onClick={() => setViewType('form')}
                    className={cn(
                      "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                      viewType === 'form'
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                        : "text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    <FileText className="w-4 h-4" />
                    الاستمارة الأصلية
                  </button>
                </div>

                {viewType === 'analysis' ? (
                  <motion.div
                    key="analysis-view"
                    ref={reportRef}
                    id="pdf-report-content"
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-12 xl:grid-rows-12 gap-4 xl:min-h-[1000px] p-3 md:p-6 bg-slate-50 rounded-[24px] md:rounded-[32px]"
                  >
                {/* Teacher Info Card */}
                <motion.div variants={itemVariants} className="bento-card col-span-12 lg:col-span-6 xl:col-span-4 xl:row-span-3 h-fit xl:h-full">
                  <div className="flex justify-between items-start mb-2">
                    <div className="bento-title">بيانات المعلم</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        title="طباعة التقرير"
                      >
                        <Printer className="w-3 h-3" />
                        طباعة
                      </button>
                      <button
                        onClick={handleDownloadPDF}
                        disabled={exporting}
                        className={cn(
                          "flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm",
                          exporting && "opacity-75 cursor-wait"
                        )}
                      >
                        {exporting ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            معالجة...
                          </>
                        ) : (
                          <>
                            <Download className="w-3 h-3" />
                            تحميل PDF
                          </>
                        )}
                      </button>
                    </div>
                  </div>
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
                </motion.div>

                {/* Main Chart Card */}
                <motion.div variants={itemVariants} className="bento-card col-span-12 lg:col-span-6 xl:col-span-5 xl:row-span-8 flex items-center justify-center relative group min-h-[400px] xl:min-h-0">
                  <div className="bento-title absolute top-5 right-5">اللقطة الدماغية (Brain Shot)</div>
                  <div className="w-full flex items-center justify-center mt-8 transition-transform group-hover:scale-105 duration-500">
                    <HBDIChart scores={selectedResponse.scores} />
                  </div>
                </motion.div>

                {/* Scores Card */}
                <motion.div variants={itemVariants} className="bento-card col-span-12 lg:col-span-6 xl:col-span-3 xl:row-span-4 h-fit xl:h-full">
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
                            transition={{ duration: 1, ease: "easeOut" }}
                            className={cn("h-full", item.color)}
                          />
                        </div>
                        <span className="text-[13px] font-bold w-8 text-left">{Math.round(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Traits Card */}
                <motion.div variants={itemVariants} className="bento-card col-span-12 lg:col-span-6 xl:col-span-4 xl:row-span-5 h-fit xl:h-full overflow-y-auto">
                  <div className="bento-title">السمات السلوكية لنمط {getDominantQuadrant(selectedResponse.scores)}</div>
                  <div className="space-y-4 mt-2">
                    <div className="flex flex-wrap gap-2">
                      {quadrantDetails[getDominantQuadrant(selectedResponse.scores) as 'A'|'B'|'C'|'D'].traits.map((trait: string) => (
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
                          {quadrantDetails[getDominantQuadrant(selectedResponse.scores) as 'A'|'B'|'C'|'D'].strengths.map((s: string) => (
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
                          {quadrantDetails[getDominantQuadrant(selectedResponse.scores) as 'A'|'B'|'C'|'D'].weaknesses.map((w: string) => (
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
                </motion.div>

                {/* Analysis Card */}
                <motion.div variants={itemVariants} className="bento-card col-span-12 xl:col-span-8 xl:row-span-4 h-fit xl:h-full">
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
                </motion.div>

                {/* Strategy Cards */}
                <motion.div variants={itemVariants} className="bento-card col-span-12 lg:col-span-6 xl:col-span-6 xl:row-span-4 overflow-hidden h-fit xl:h-full">
                  <div className="bento-title">كيفية التعامل مع المعلم</div>
                  <div className="bg-slate-50 p-4 rounded-[8px] border border-slate-200 h-full overflow-y-auto">
                    <p className="text-[14px] text-slate-700 leading-relaxed">
                      {quadrantDetails[getDominantQuadrant(selectedResponse.scores) as 'A'|'B'|'C'|'D'].dealing}
                    </p>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="bento-card col-span-12 lg:col-span-6 xl:col-span-6 xl:row-span-4 overflow-hidden h-fit xl:h-full">
                  <div className="bento-title">التعزيز والتحفيز المناسب</div>
                  <div className="bg-green-50 p-4 rounded-[8px] border border-green-100 h-full overflow-y-auto">
                    <p className="text-[14px] text-green-800 leading-relaxed">
                      {quadrantDetails[getDominantQuadrant(selectedResponse.scores) as 'A'|'B'|'C'|'D'].reinforcement}
                    </p>
                  </div>
                </motion.div>

                {/* OSCAR Coaching Session Panel */}
                <motion.div variants={itemVariants} className="bento-card col-span-12 xl:row-span-10 overflow-hidden bg-white text-slate-900 border border-slate-200 shadow-xl h-fit">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-100">
                        <Brain className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900">تطبيق منهجية أوسكار (OSCAR) الدولية</h2>
                        <p className="text-slate-500 text-xs">نموذج عالمي مخصص لجلسات التوجيه التربوي الفعال</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start md:self-center">
                      <button
                        onClick={() => setOscarMode('specific')}
                        className={cn(
                          "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                          oscarMode === 'specific' 
                            ? "bg-white text-indigo-600 shadow-sm" 
                            : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        تحليل النمط ( {getDominantQuadrant(selectedResponse.scores)} )
                      </button>
                      <button
                        onClick={() => setOscarMode('general')}
                        className={cn(
                          "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                          oscarMode === 'general' 
                            ? "bg-white text-indigo-600 shadow-sm" 
                            : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        الأسئلة العامة
                      </button>
                    </div>

                    <div className="bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-xl text-xs font-bold text-indigo-700 self-start md:self-center">
                      {oscarMode === 'specific' ? `توجيه مخصص: ${getQuadrantLabel(getDominantQuadrant(selectedResponse.scores))}` : 'أسئلة الكوتشينج العامة'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-2">
                    {[
                      { key: 'o', label: 'O - Outcome', sub: 'المخرج النهائي', bg: 'bg-rose-50/50', border: 'border-rose-100', text: 'text-rose-700' },
                      { key: 's', label: 'S - Situation', sub: 'الوضع الحالي', bg: 'bg-amber-50/50', border: 'border-amber-100', text: 'text-amber-700' },
                      { key: 'c', label: 'C - Choices', sub: 'الخيارات والنتائج', bg: 'bg-emerald-50/50', border: 'border-emerald-100', text: 'text-emerald-700' },
                      { key: 'a', label: 'A - Actions', sub: 'الخطة المستقبلية', bg: 'bg-blue-50/50', border: 'border-blue-100', text: 'text-blue-700' },
                      { key: 'r', label: 'R - Review', sub: 'المراجعة والمتابعة', bg: 'bg-indigo-50/50', border: 'border-indigo-100', text: 'text-indigo-700' },
                    ].map((step) => {
                      const modeKey = oscarMode === 'general' ? 'GENERAL' : getDominantQuadrant(selectedResponse.scores);
                      const questions = oscarQuestions[modeKey][step.key as 'o'|'s'|'c'|'a'|'r'];
                      return (
                        <div key={step.key} className={cn("p-5 rounded-2xl border flex flex-col gap-4 transition-all hover:bg-white hover:shadow-md group/card", step.bg, step.border)}>
                          <div className="flex flex-col gap-1">
                            <div className={cn("text-[14px] font-black tracking-tighter uppercase", step.text)}>
                              {step.label}
                            </div>
                            <div className="text-[11px] font-bold text-slate-500 italic">
                              {step.sub}
                            </div>
                          </div>
                          <div className="space-y-4">
                            {questions.map((q, idx) => (
                              <p key={idx} className="text-[14px] text-slate-900 font-bold leading-relaxed border-r-2 border-slate-200 pr-3 group-hover/card:border-indigo-400 transition-colors">
                                {q}
                              </p>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-4">
                    <div className="bg-indigo-600 text-white p-2 rounded-lg font-bold text-sm shrink-0">معلومة منهجية</div>
                    <p className="text-sm text-slate-600 leading-relaxed font-bold">
                      تتكامل **منهجية OSCAR** مع **مقياس هيرمان** لضمان أن الأسئلة المطروحة تحاكي "اللغة الدماغية" المفضلة للمعلم. استخدام هذه الأسئلة يقلل من المقاومة الطبيعية للتغيير ويرفع من دافعية المعلم للتطوير الذاتي.
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            ) : (
                  <motion.div
                    key="form-view"
                    ref={reportRef}
                    id="pdf-form-content"
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="space-y-6 bg-white p-6 md:p-10 rounded-[24px] md:rounded-[32px] border border-slate-100 shadow-sm"
                  >
                    {/* Form Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-8 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <CheckSquare className="w-8 h-8 text-indigo-600" />
                          <h2 className="text-3xl font-black text-slate-900">سجل إجابات المعلم</h2>
                        </div>
                        <p className="text-slate-500 font-medium">الاستمارة الأصلية واللقطة الدماغية للمعلم: {selectedResponse.teacherName}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handlePrint}
                          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 rounded-xl text-[13px] font-bold transition-all"
                        >
                          <Printer className="w-4 h-4" />
                          طباعة
                        </button>
                        <button
                          onClick={handleDownloadPDF}
                          disabled={exporting}
                          className={cn(
                            "flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl text-[13px] font-bold transition-all shadow-lg shadow-indigo-100",
                            exporting && "opacity-75 cursor-wait"
                          )}
                        >
                          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                          تنزيل الاستمارة (PDF)
                        </button>
                      </div>
                    </div>

                    {/* Snapshot Summary */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-8 items-center bg-slate-50/50 rounded-3xl p-6 border border-slate-50">
                      <div className="flex justify-center flex-col items-center">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 bg-white px-4 py-1.5 rounded-full border border-slate-100 shadow-sm">اللقطة الدماغية الخاصة بالاستمارة</span>
                        <HBDIChart scores={selectedResponse.scores} />
                      </div>
                      <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                          <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4">ملخص البيانات</h4>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 font-medium">الاسم:</span>
                              <span className="font-bold text-slate-900">{selectedResponse.teacherName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 font-medium">البريد:</span>
                              <span className="font-bold text-slate-900">{selectedResponse.teacherEmail || '---'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 font-medium">تاريخ الإرسال:</span>
                              <span className="font-bold text-slate-900">{selectedResponse.createdAt?.toDate().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                              <span className="text-slate-500 font-medium">النمط السائد:</span>
                              <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold">{getQuadrantLabel(getDominantQuadrant(selectedResponse.scores))}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          {Object.entries(selectedResponse.scores).map(([q, s]) => (
                            <div key={q} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                              <div className="text-[10px] font-black text-slate-400 mb-1">الدرجة ({q})</div>
                              <div className="text-xl font-black text-slate-900">{Math.round(s as number)}%</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Detailed Questions & Answers */}
                    <div className="pt-8">
                      <div className="flex items-center gap-2 mb-8 bg-indigo-50/50 w-fit px-4 py-2 rounded-full border border-indigo-100/50">
                        <List className="w-4 h-4 text-indigo-600" />
                        <h3 className="text-sm font-black text-indigo-700">تفاصيل الإجابات على الـ 56 عبارة</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                        {questions.map((q, idx) => (
                          <div key={q.id} className="group flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                            <span className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-slate-100 text-slate-500 text-xs font-black rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                              {idx + 1}
                            </span>
                            <div className="flex-grow space-y-2">
                              <p className="text-[14px] text-slate-700 font-medium leading-relaxed group-hover:text-slate-900 transition-colors">
                                {q.text}
                              </p>
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-1.5 font-bold">
                                  {[1, 2, 3, 4, 5].map((val) => (
                                    <div
                                      key={val}
                                      className={cn(
                                        "w-6 h-6 rounded-md flex items-center justify-center text-[10px] transition-all",
                                        selectedResponse.answers[q.id] === val
                                          ? "bg-indigo-600 text-white scale-110 shadow-md shadow-indigo-100"
                                          : "bg-slate-100 text-slate-400 opacity-40"
                                      )}
                                    >
                                      {val}
                                    </div>
                                  ))}
                                </div>
                                <span className={cn(
                                  "text-[10px] font-black uppercase px-2 py-0.5 rounded-md",
                                  q.quadrant === 'A' ? "bg-blue-100 text-blue-700" :
                                  q.quadrant === 'B' ? "bg-green-100 text-green-700" :
                                  q.quadrant === 'C' ? "bg-red-100 text-red-700" :
                                  "bg-yellow-100 text-yellow-700"
                                )}>
                                  النمط {q.quadrant}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
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
