import Link from "next/link";

type LogoProps = {
    className?: string;
    dark?: boolean;
};

const Logo = ({ className, dark }: LogoProps) => (
    <Link
        className={`flex items-center text-2xl font-bold tracking-tight ${
            dark ? "text-n-7" : "text-n-1"
        } ${className}`}
        href="/"
    >
        FasterClaw
    </Link>
);

export default Logo;
