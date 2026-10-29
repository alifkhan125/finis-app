import OnboardingLegalScreen from "@/components/auth/OnboardingLegalScreen";

export default function TermsRoute() {
  return (
    <OnboardingLegalScreen
      slug="terms-and-conditions"
      fallbackTitle="Terms & Conditions"
      nextRoute="/screens/auth/welcome"
    />
  );
}
