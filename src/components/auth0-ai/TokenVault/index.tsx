import { TokenVaultConsentPopup } from "./popup";
import { TokenVaultConsentRedirect } from "./redirect";
import type { TokenVaultAuthProps } from "./TokenVaultAuthProps";

export function TokenVaultConsent(props: TokenVaultAuthProps) {
  const { mode } = props;

  switch (mode) {
    case "popup":
      return <TokenVaultConsentPopup {...props} />;
    case "redirect":
      return <TokenVaultConsentRedirect {...props} />;
    case "auto":
    default:
      return <TokenVaultConsentPopup {...props} />;
  }
}
