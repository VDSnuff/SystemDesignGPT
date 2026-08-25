interface AsyncStatusProps {
  readonly className?: string;
  readonly isError?: boolean;
  readonly message: string;
}

export function AsyncStatus({ className, isError = false, message }: AsyncStatusProps) {
  return (
    <span aria-atomic="true" className={className} role={isError ? "alert" : "status"}>
      {message}
    </span>
  );
}
