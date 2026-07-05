export default function PlaceholderPage({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="text-5xl">{icon}</div>
      <h1 className="text-2xl font-bold text-light-text dark:text-dark-text">{title}</h1>
      <p className="max-w-md text-light-muted dark:text-dark-muted">{subtitle}</p>
    </div>
  );
}
