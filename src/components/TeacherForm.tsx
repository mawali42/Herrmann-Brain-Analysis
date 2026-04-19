import React, { useState } from 'react';
import { questions } from '../data/questions';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, User, Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import confetti from 'canvas-confetti';

interface TeacherFormProps {
  ownerId: string;
}

const TeacherForm: React.FC<TeacherFormProps> = ({ ownerId }) => {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Split questions into chunks for a multi-step form
  const questionsPerPage = 8;
  const totalPages = Math.ceil(questions.length / questionsPerPage);

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => s - 1);

  const handleAnswer = (qId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Calculate scores
      const quadrantScores = { A: 0, B: 0, C: 0, D: 0 };
      const counts = { A: 0, B: 0, C: 0, D: 0 };

      questions.forEach((q) => {
        const val = answers[q.id] || 0;
        quadrantScores[q.quadrant] += val;
        counts[q.quadrant]++;
      });

      // Normalize to 0-100 (assuming 1-5 scale)
      const normalizedScores = {
        A: (quadrantScores.A / (counts.A * 5)) * 100,
        B: (quadrantScores.B / (counts.B * 5)) * 100,
        C: (quadrantScores.C / (counts.C * 5)) * 100,
        D: (quadrantScores.D / (counts.D * 5)) * 100,
      };

      await addDoc(collection(db, 'responses'), {
        teacherName: formData.name,
        teacherEmail: formData.email,
        ownerId: ownerId, // Link to the admin
        scores: normalizedScores,
        answers,
        createdAt: serverTimestamp(),
      });

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2D5DA1', '#4DA650', '#E53935', '#FBC02D']
      });

      setIsSubmitted(true);
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('حدث خطأ أثناء الإرسال. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl shadow-xl border border-slate-100 max-w-lg mx-auto mt-10">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="bg-green-100 p-4 rounded-full mb-6"
        >
          <CheckCircle2 className="w-16 h-16 text-green-600" />
        </motion.div>
        <h2 className="text-3xl font-bold text-slate-900 mb-4">شكراً لك يا أستاذ {formData.name}</h2>
        <p className="text-slate-600 mb-8 leading-relaxed">
          تم استلام إجاباتك بنجاح. سيقوم المحلل بمراجعة استمارتك وتقديم التغذية الراجعة لك قريباً.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Progress Bar */}
        <div className="h-2 bg-slate-100 w-full">
          <motion.div
            className="h-full bg-accent-bento"
            animate={{ width: `${((step + 1) / (totalPages + 1)) * 100}%` }}
          />
        </div>

        <div className="p-8 md:p-12">
          <AnimatePresence mode="wait">
            {step === 0 ? (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div>
                  <h1 className="text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">استمارة مقياس هيرمان</h1>
                  <p className="text-slate-500 text-lg">يرجى إدخال بياناتك الأساسية للبدء في التقييم.</p>
                </div>

                <div className="space-y-6">
                  <div className="relative">
                    <label className="block text-sm font-semibold text-slate-700 mb-2 mr-1">الاسم الكامل</label>
                    <div className="relative">
                      <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pr-12 pl-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg"
                        placeholder="أدخل اسمك هنا..."
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-semibold text-slate-700 mb-2 mr-1">البريد الإلكتروني (اختياري)</label>
                    <div className="relative">
                      <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pr-12 pl-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg"
                        placeholder="name@example.com"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleNext}
                  disabled={!formData.name}
                  className="w-full flex items-center justify-center gap-2 bg-accent-bento hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-5 rounded-2xl transition-all shadow-lg shadow-blue-200 text-xl"
                >
                  بدء التقييم
                  <ArrowLeft className="w-6 h-6" />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key={`step${step}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">إلى أي مدى تنطبق عليك هذه العبارات؟</h3>
                  <p className="text-slate-500 underline decoration-indigo-200 underline-offset-4">الصفحة {step} من {totalPages}</p>
                </div>

                <div className="space-y-12">
                  {questions
                    .slice((step - 1) * questionsPerPage, step * questionsPerPage)
                    .map((q) => (
                      <div key={q.id} className="space-y-6">
                        <p className="text-xl font-medium text-slate-800 leading-relaxed pr-2 border-r-4 border-accent-bento">
                          {q.text}
                        </p>
                        <div className="grid grid-cols-5 gap-3">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <button
                              key={val}
                              onClick={() => handleAnswer(q.id, val)}
                              className={cn(
                                "flex flex-col items-center justify-center p-2 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all gap-1 sm:gap-2",
                                answers[q.id] === val
                                  ? "bg-blue-50 border-accent-bento text-blue-700 shadow-inner"
                                  : "border-slate-100 hover:border-slate-300 bg-white text-slate-400 hover:bg-slate-50"
                              )}
                            >
                              <span className="text-lg font-bold">{val}</span>
                              <span className="text-[9px] sm:text-[10px] leading-tight text-center">
                                {val === 1 ? 'لا ينطبق' : val === 5 ? 'ينطبق جداً' : ''}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>

                <div className="flex gap-4 pt-6">
                  <button
                    onClick={handleBack}
                    className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowRight className="w-5 h-5" />
                    السابق
                  </button>
                  {step === totalPages ? (
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting || Object.keys(answers).length < questions.length}
                      className="flex-[2] py-4 bg-accent-bento hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? 'جاري الإرسال...' : 'إرسال الاستمارة'}
                    </button>
                  ) : (
                    <button
                      onClick={handleNext}
                      className="flex-[2] py-4 bg-accent-bento hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                    >
                      التالي
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default TeacherForm;
