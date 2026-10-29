import OnboardingLegalScreen from "@/components/auth/OnboardingLegalScreen";

export default function PrivacyRoute() {
  return (
    <OnboardingLegalScreen
      slug="privacy-policy"
      fallbackTitle="Privacy Policy"
      nextRoute="/screens/auth/faq"
    />
  );
}
