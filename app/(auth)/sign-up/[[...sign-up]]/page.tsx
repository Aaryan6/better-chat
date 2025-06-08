// app/(auth)/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="clerk-auth-form-container">
      <SignUp path="/sign-up" />
    </div>
  );
}
