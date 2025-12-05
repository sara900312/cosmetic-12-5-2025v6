import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const ACCESS_KEY = 'Po0FZEpzq9d2osj3X2';
    const hasKey = () => {
        const keyFromQuery = searchParams.get('key');
        const saved = typeof window !== 'undefined' ? localStorage.getItem('admin_access_key') : null;
        return keyFromQuery === ACCESS_KEY || saved === ACCESS_KEY;
    };

    useEffect(() => {
        const keyFromQuery = searchParams.get('key');
        if (keyFromQuery === ACCESS_KEY) {
            localStorage.setItem('admin_access_key', ACCESS_KEY);
        }
        if (!hasKey()) {
            navigate('/', { replace: true });
        }
    }, [searchParams, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        const { user, role, error } = await signIn(email.trim(), password.trim());

        if (error) {
            toast({
                title: "خطأ في تسجيل الدخول",
                description: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
                variant: "destructive",
            });
            setLoading(false);
            return;
        }

        if (role === 'admin' || role === 'assistant') {
            toast({
                title: "تم تسجيل الدخول بنجاح",
                description: "مرحباً بعودتك!",
            });
            navigate('/inventory');
        } else {
            toast({
                title: "وصول غير مصرح به",
                description: "ليس لديك الصلاحية للوصول إلى هذه الصفحة.",
                variant: "destructive",
            });
        }
        
        setLoading(false);
    };

    if (!hasKey()) return null;

    return (
        <div className="min-h-screen flex flex-col bg-gray-900 text-white">
            <Header />
            <main className="flex-grow flex items-center justify-center p-4">
                <div className="w-full max-w-md p-8 space-y-8 glass-effect rounded-xl shadow-lg">
                    <div className="text-center">
                        <h2 className="text-3xl font-extrabold text-white">
                            تسجيل الدخول إلى لوحة التحكم
                        </h2>
                        <p className="mt-2 text-sm text-gray-400">
                            الوصول متاح للمسؤولين والمساعدين فقط
                        </p>
                    </div>
                    <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                        <div className="rounded-md shadow-sm space-y-4">
                            <div>
                                <label htmlFor="email-address" className="sr-only">
                                    البريد الإلكتروني
                                </label>
                                <input
                                    id="email-address"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none relative block w-full px-3 py-3 border border-gray-700 bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                                    placeholder="البريد الإلكتروني"
                                />
                            </div>
                            <div>
                                <label htmlFor="password" className="sr-only">
                                    كلمة المرور
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none relative block w-full px-3 py-3 border border-gray-700 bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                                    placeholder="كلمة المرور"
                                />
                            </div>
                        </div>

                        <div>
                            <Button
                                type="submit"
                                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-300 ease-in-out"
                                disabled={loading}
                            >
                                {loading ? 'جاري التحقق...' : 'تسجيل الدخول'}
                            </Button>
                        </div>
                    </form>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default LoginPage;
