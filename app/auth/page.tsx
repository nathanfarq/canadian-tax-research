import { AuthForm } from "@/components/auth/AuthForm";

export default function AuthPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className="mb-8">
        <img
          src="/images/20260125-logo2-cropped-transparent.png"
          alt="TaxBuddy"
          className="h-16"
        />
      </div>
      <AuthForm />
    </div>
  );
}
