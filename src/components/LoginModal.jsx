import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

const LoginModal = ({ isOpen, setIsOpen }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        const trimmedEmail = email.trim();
        const trimmedPassword = password.trim();

        if (!trimmedEmail || !trimmedPassword) {
             toast({
                title: "خطأ في الإدخال",
                description: "الرجاء إدخال البريد الإلكتروني وكلمة المرور.",
                variant: "destructive",
            });
            setLoading(false);
            return;
        }

        const { error } = await signIn(trimmedEmail, trimmedPassword);
        
        if (error) {
            toast({
                title: "خطأ في تسجيل الدخول",
                description: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
                variant: "destructive",
            });
        } else {
            toast({
                title: "تم تسجيل الدخول بنجاح",
                description: "مرحباً بعودتك!",
            });
            setIsOpen(false);
            navigate('/inventory');
        }
        setLoading(false);
    };

    const handleInputChange = (setter) => (e) => {
        setter(e.target.value);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                    onClick={() => setIsOpen(false)}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-md p-8 space-y-6 glass-effect rounded-2xl border border-white/20"
                    >
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 text-white hover:bg-white/10"
                        >
                            <X />
                        </Button>
                        <div>
                            <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
                                تسجيل الدخول إلى المخزن
                            </h2>
                        </div>
                        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                            <div className="rounded-md shadow-sm space-y-4">
                                <input
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={handleInputChange(setEmail)}
                                    className="appearance-none block w-full px-3 py-3 border border-gray-700 bg-gray-800/80 text-white placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                                    placeholder="البريد الإلكتروني"
                                />
                                <input
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={handleInputChange(setPassword)}
                                    className="appearance-none block w-full px-3 py-3 border border-gray-700 bg-gray-800/80 text-white placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                                    placeholder="كلمة المرور"
                                />
                            </div>

                            <div>
                                <Button
                                    type="submit"
                                    className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white gradient-bg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                                    disabled={loading}
                                >
                                    {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default LoginModal;