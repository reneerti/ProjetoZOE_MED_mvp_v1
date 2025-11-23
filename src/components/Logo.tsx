import logoImage from "@/assets/zoe-med-logo-oficial.png";

interface LogoProps {
  className?: string;
  onClick?: () => void;
}

export const Logo = ({ className = "w-20 h-auto", onClick }: LogoProps) => {
  return (
    <img 
      src={logoImage} 
      alt="Zoe Med - Saúde Inteligente" 
      className={`${className} ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
      onClick={onClick}
    />
  );
};
