import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-5xl w-full text-center space-y-8">
        <h1 className="text-6xl font-bold tracking-tight">
          Manual Avatar Platform
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Create high-quality avatar videos with precision and control.
          Professional tools for premium content creation.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/login">
            <Button size="lg">Get Started</Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="outline">
              Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
