import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  Menu,
  X,
  Phone,
  Mail,
  Facebook,
  Instagram,
  Youtube,
  MessageCircle,
  Warehouse,
  Bell,
  Lock,
  LogOut,
  ExternalLink,
} from "lucide-react";
import TikTokIcon from "@/components/icons/TikTokIcon";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useSupabase } from "@/contexts/SupabaseContext";
import { useAuth } from "@/contexts/AuthContext";
import CartSidebar from "@/components/CartSidebar";
import { toast } from "@/components/ui/use-toast";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [contactDetails, setContactDetails] = useState({
    phone: "",
    email: "",
  });
  const [socialLinks, setSocialLinks] = useState([]);
  const [isScrolled, setIsScrolled] = useState(false);
  const { getTotalItems, setIsOpen: setCartOpen } = useCart();
  const { isDark } = useTheme();
  const { supabase } = useSupabase();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchContactInfo = async () => {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from("contact_info")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true });

        if (error) throw error;

        const phoneInfo = data.find((item) => item.type === "phone");
        const emailInfo = data.find((item) => item.type === "email");
        const socials = data.filter(
          (item) => item.type === "social"
        );

        setContactDetails({
          phone: phoneInfo ? phoneInfo.value : "+964 770 123 4567",
          email: emailInfo ? emailInfo.value : "info@neomart.iq",
        });
        setSocialLinks(socials);
      } catch (error) {
        console.error("Error fetching contact info:", error?.message || error);
      }
    };
    fetchContactInfo();
  }, [supabase]);

  const handleInventoryClick = () => {
    if (user) {
      navigate("/inventory");
    } else {
      navigate("/ahmedloginwith3non");
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast({ title: "تم تسجيل الخروج بنجاح" });
    navigate("/");
  };

  const menuItems = [
    { name: "الرئيسية", nameEn: "Home", path: "/" },
    { name: "المنتجات", nameEn: "Products", path: "/products" },
    { name: "العناية بالشعر", nameEn: "Hair Care", path: "/products/hair_care" },
    { name: "العناية بالبشرة", nameEn: "Skincare", path: "/products/skincare" },
    { name: "مكياج", nameEn: "Makeup", path: "/products/makeup" },
    { name: "عطور", nameEn: "Perfumes", path: "/products/perfumes" },
    { name: "ماسكات", nameEn: "Masks", path: "/products/masks" },
    { name: "سيرومات", nameEn: "Serums", path: "/products/serums" },
    { name: "زيوت", nameEn: "Oils", path: "/products/oils" },
    { name: "مستلزمات حمّام", nameEn: "Bath Essentials", path: "/products/bath_essentials" },
    { name: "أدوات تجميل", nameEn: "Beauty Tools", path: "/products/beauty_tools" },
    { name: "العناية بالجسم", nameEn: "Body Care", path: "/products/body_care" },
  ];

  const mobileOnlyMenuItems = [
    { name: "الرئيسية", nameEn: "Home", path: "/" },
    {
      name: "تواصل معنا",
      nameEn: "Contact Us",
      action: () => {
        setIsContactOpen((prev) => !prev);
        setIsMenuOpen(false);
      },
    },
  ];

  const categoryMenuItems = menuItems.filter(
    (item) => item.path.startsWith("/products/") || item.path === "/products",
  );

  const getSocialIcon = (iconField, titleField) => {
    const iconProps = {
      className: "h-7 w-7 transition-all duration-300 hover:scale-125 stroke-current stroke-[1.5]",
      strokeWidth: 1.5,
    };

    // Use icon field first, fallback to title for backward compatibility
    const iconName = (iconField || titleField || '').toLowerCase();

    if (iconName.includes("tiktok")) return <TikTokIcon {...iconProps} />;
    if (iconName.includes("facebook")) return <Facebook {...iconProps} />;
    if (iconName.includes("instagram")) return <Instagram {...iconProps} />;
    if (iconName.includes("youtube")) return <Youtube {...iconProps} />;
    if (iconName.includes("whatsapp") || iconName.includes("whats")) return <MessageCircle {...iconProps} />;
    if (iconName.includes("email") || iconName.includes("gmail"))
      return <Mail {...iconProps} />;
    return null;
  };

  const handleContactClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsContactOpen((prev) => !prev);
  };

  const headerTextColorClass = "text-[#1A1A1A]";
  const headerButtonBgClass = "hover:bg-transparent";
  const headerTextMutedColorClass = "text-[#1A1A1A]";
  const headerHoverTextClass = "hover:text-pink-500";

  return (
    <>
      <div className="bg-gradient-to-r from-pink-400 to-rose-300 text-white text-center py-1 text-sm font-semibold">
        <p>مرحباً بكم في متجرنا</p>
      </div>
      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/70 backdrop-blur-md border-b border-pink-200/10'
            : 'glass-effect border-b border-pink-200/30'
        }`}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex-1 flex items-center justify-start gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCartOpen(true)}
                className={`relative header-button-override ${headerTextColorClass} ${headerButtonBgClass} p-2`}
                aria-label="Open shopping cart"
              >
                <ShoppingCart className="h-6 w-6" strokeWidth={2} />
                {getTotalItems() > 0 && (
                  <span
                    className="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/3 bg-gradient-to-r from-pink-500 to-rose-400 text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold text-white border-2 border-white/30"
                  >
                    {getTotalItems()}
                  </span>
                )}
              </Button>
            </div>

            <div className="flex-1 flex justify-center">
              <Link to="/" className="flex flex-col items-center">
                <h1 className="text-2xl font-bold text-gradient">NEOMART</h1>
              </Link>
            </div>

            <div className="flex-1 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`md:hidden ${headerTextColorClass} ${headerButtonBgClass}`}
                aria-label="Open menu"
              >
                {isMenuOpen ? (
                  <X className="h-6 w-6" strokeWidth={2} />
                ) : (
                  <Menu className="h-6 w-6" strokeWidth={2} />
                )}
              </Button>
            </div>
          </div>

          <nav
            className={`hidden md:flex items-center justify-center gap-4 text-sm ${headerTextMutedColorClass} pb-2`}
          >
            <Link
              to="/"
              className={`${headerHoverTextClass} transition-colors`}
            >
              الصفحة الرئيسية
            </Link>
            <span>|</span>
            <Link
              to="/products"
              className={`${headerHoverTextClass} transition-colors`}
            >
              الفئات
            </Link>
            <span>|</span>
            <button
              onClick={handleContactClick}
              className={`${headerHoverTextClass} transition-colors`}
            >
              تواصل معنا
            </button>
            <span>|</span>
            <a
              href="https://neomart.space/"
              className={`${headerHoverTextClass} transition-colors flex items-center gap-1`}
            >
              الموقع الرئيسي
            </a>
          </nav>

          <AnimatePresence>
            {isContactOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={`overflow-hidden border-t ${isDark ? "border-white/20" : "border-black/20"}`}
              >
                <div className={`py-6 text-center ${headerTextColorClass}`}>
                  <div className="flex flex-col md:flex-row justify-center items-center gap-6 mb-6">
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5" strokeWidth={1.5} />
                      <span>{contactDetails.phone}</span>
                    </div>
                    <a
                      href={`mailto:${contactDetails.email}`}
                      className="flex items-center gap-3 hover:text-purple-300 transition-colors"
                    >
                      <Mail className="h-5 w-5" strokeWidth={1.5} />
                      <span>{contactDetails.email}</span>
                    </a>
                  </div>
                  <div className="flex justify-center gap-8">
                    {socialLinks.map((social) => (
                      <motion.a
                        key={social.id}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-[#FF2F92] hover:text-[#FF2F92] transition-all duration-300 hover:-translate-y-2`}
                        style={{
                          filter: 'drop-shadow(0 0 8px rgba(255, 47, 146, 0.4))',
                          textShadow: '0 0 10px rgba(255, 47, 146, 0.3)'
                        }}
                        aria-label={social.title}
                        whileHover={{ scale: 1.15, filter: 'drop-shadow(0 0 16px rgba(255, 47, 146, 0.6))' }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {getSocialIcon(social.icon, social.title)}
                      </motion.a>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={`md:hidden overflow-hidden border-t ${isDark ? "border-white/20" : "border-black/20"}`}
              >
                <nav className="py-2">
                  {mobileOnlyMenuItems.map((item, index) =>
                    item.path ? (
                      <Link
                        key={index}
                        to={item.path}
                        onClick={() => setIsMenuOpen(false)}
                        className={`block px-4 py-3 ${headerTextColorClass} ${headerButtonBgClass} transition-colors`}
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <button
                        key={index}
                        onClick={item.action}
                        className={`block w-full text-right px-4 py-3 ${headerTextColorClass} ${headerButtonBgClass} transition-colors`}
                      >
                        {item.name}
                      </button>
                    ),
                  )}
                  <div className={`px-4 py-2 text-white/60 text-sm`}>
                    الفئات
                  </div>
                  {categoryMenuItems.map((item, index) => (
                    <Link
                      key={`cat-${index}`}
                      to={item.path}
                      onClick={() => setIsMenuOpen(false)}
                      className={`block pl-8 pr-4 py-3 ${headerTextColorClass} ${headerButtonBgClass} transition-colors`}
                    >
                      {item.name}
                    </Link>
                  ))}
                  <a
                    href="https://neomart.space/"
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-3 ${headerTextColorClass} ${headerButtonBgClass} transition-colors`}
                  >
                    الموقع الرئيسي
                  </a>
                </nav>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>
      <CartSidebar />
    </>
  );
};

export default Header;
