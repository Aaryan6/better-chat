// app/(auth)/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="clerk-auth-form-container">
      <SignIn path="/sign-in" />
    </div>
  );
}
