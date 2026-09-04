import { UserAuthProvider } from "./UserAuthContext";
import UserLayoutClient from "./UserLayoutClient";

export const metadata = {
  title: "User Portal - 9Router",
  description: "Monitor your API Key quotas, usage, remaining tokens, and model catalog.",
};

export default function UserLayout({ children }) {
  return (
    <UserAuthProvider>
      <UserLayoutClient>{children}</UserLayoutClient>
    </UserAuthProvider>
  );
}
