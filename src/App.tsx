/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import TeacherForm from './components/TeacherForm';
import AdminPanel from './components/AdminPanel';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, BookOpen, LogOut, Link as LinkIcon, User as UserIcon, Brain } from 'lucide-react';
import { cn } from './lib/utils';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if we are in "Teacher Mode" via URL params
  const [urlParams] = useState(new URLSearchParams(window.location.search));
  const ownerIdFromUrl = urlParams.get('ownerId');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login failed", err);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) return null;

  // If a specific ownerId is present in URL, we show the form
  const isTeacherView = !!ownerIdFromUrl;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans" dir="rtl">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-accent-bento p-2 rounded-xl">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent-bento to-blue-800">
              منصة بوصلة التفكير
            </span>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col items-end mr-2">
                  <span className="text-sm font-bold text-slate-800">{user.displayName}</span>
                  <span className="text-[10px] text-slate-400">مسؤول النظام</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">خروج</span>
                </button>
              </div>
            ) : (
              !isTeacherView && (
                <button
                  onClick={handleLogin}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-accent-bento hover:bg-blue-100 transition-all font-medium"
                >
                  <Shield className="w-4 h-4" />
                  دخول المسؤولين
                </button>
              )
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="py-8">
        <AnimatePresence mode="wait">
          {user && !isTeacherView ? (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Admin Action Bar */}
              <div className="max-w-7xl mx-auto px-6">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold">مرحباً بك في لوحة تحكمك</h2>
                    <p className="text-blue-100 text-sm">انسخ الرابط أدناه وأرسله لمعلميك لتبدأ التحليلات.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 flex items-center gap-3 overflow-hidden">
                      <LinkIcon className="w-4 h-4 shrink-0 text-blue-200" />
                      <span className="text-xs font-mono truncate max-w-[200px] dir-ltr text-blue-50">
                        {window.location.origin}/?ownerId={user.uid}
                      </span>
                    </div>
                    <button 
                      onClick={() => {
                        const link = `${window.location.origin}/?ownerId=${user.uid}`;
                        navigator.clipboard.writeText(link);
                        alert('تم نسخ الرابط بنجاح! أرسله الآن للمعلمين.');
                      }}
                      className="bg-white text-blue-600 px-6 py-3 rounded-2xl font-bold hover:bg-blue-50 transition-all shadow-lg"
                    >
                      نسخ الرابط
                    </button>
                  </div>
                </div>
              </div>
              <AdminPanel />
            </motion.div>
          ) : isTeacherView ? (
            <motion.div
              key="teacher"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <TeacherForm ownerId={ownerIdFromUrl!} />
            </motion.div>
          ) : (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-4xl mx-auto px-6 text-center py-20"
            >
              <div className="inline-block p-4 bg-blue-50 rounded-3xl mb-8">
                <Brain className="w-16 h-16 text-accent-bento" />
              </div>
              <h1 className="text-5xl font-black text-slate-900 mb-6 leading-tight">
                منصة تحليل <span className="text-accent-bento underline decoration-blue-200">اللقطات الدماغية</span> للمعلمين
              </h1>
              <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
                حلِّل أنماط تفكير فريقك التربوي بكل سهولة واحترافية. سجل دخولك الآن كمسؤول وابدأ في جمع الاستمارات.
              </p>
              <button
                onClick={handleLogin}
                className="bg-accent-bento hover:bg-blue-700 text-white px-10 py-5 rounded-2xl font-bold text-xl transition-all shadow-xl shadow-blue-200 flex items-center gap-3 mx-auto"
              >
                <UserIcon className="w-6 h-6" />
                الدخول عبر جوجل للبدء
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="text-center py-12 text-slate-400 text-sm border-t border-slate-100 mt-12 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <p className="mb-2 font-bold text-slate-700">
            تصميم وتطوير أ. سعود المعولي
          </p>
          <p className="mb-5">
            <a href="mailto:saud22@moe.om" className="hover:text-accent-bento transition-colors font-medium">saud22@moe.om</a>
          </p>
          <div className="text-xs opacity-50">
            &copy; {new Date().getFullYear()} منصة بوصلة التفكير - جميع الحقوق محفوظة
          </div>
        </div>
      </footer>
    </div>
  );
}
