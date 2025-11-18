import logoImage from "@/assets/zoe-med-logo-new.png";

export const Logo = ({ className = "w-16 h-16" }: { className?: string }) => {
  return (
    <img 
      src={logoImage} 
      alt="Zoe Med - Saúde Inteligente" 
      className={className}
    />
  );
};
