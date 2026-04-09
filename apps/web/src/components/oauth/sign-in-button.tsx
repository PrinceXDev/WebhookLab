"use client";

import { signIn } from "next-auth/react";
import { Button, type ButtonProps } from "@/components/ui/button";

type SignInButtonProps = ButtonProps;

const SignInButton = ({
  onClick,
  type = "button",
  "aria-label": ariaLabel,
  ...props
}: SignInButtonProps) => (
  <Button
    {...props}
    type={type}
    aria-label={ariaLabel ?? "Sign in with GitHub"}
    onClick={(e) => {
      onClick?.(e);
      if (!e.defaultPrevented) {
        void signIn("github", { callbackUrl: "/dashboard" });
      }
    }}
  />
);

export default SignInButton;
