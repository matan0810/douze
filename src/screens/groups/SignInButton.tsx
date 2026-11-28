import { signInUrl } from '../../net/api';
import { useI18n } from '../../i18n/context';
import { rememberAfterSignIn } from '../../state/session';
import { Icon } from '../../ui/Icon';

/**
 * Sends the person to Google through the Worker, remembering where they were so they come
 * back to it. The site only navigates: no script from Google runs here.
 */
export function SignInButton() {
  const { t } = useI18n();
  const go = () => {
    const url = signInUrl(`${location.origin}${location.pathname}`);
    if (!url) return;
    rememberAfterSignIn(location.hash);
    location.assign(url);
  };
  return (
    <button type="button" className="btn btn-primary" onClick={go}>
      <Icon name="group" size={16} />
      {t.signIn.button}
    </button>
  );
}
