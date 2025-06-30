import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Users, CheckSquare, BarChart3 } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const features = [
    {
      icon: Building,
      title: "Property Management",
      description: "Manage all your properties from a single, intuitive dashboard"
    },
    {
      icon: CheckSquare,
      title: "Task Management",
      description: "Assign, track, and complete tasks with your team efficiently"
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Keep your team connected with built-in messaging and notifications"
    },
    {
      icon: BarChart3,
      title: "Analytics & Insights",
      description: "Get real-time insights into your property operations and team performance"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="pt-16 pb-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-900 sm:text-5xl md:text-6xl">
              Nestive
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-slate-600 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Professional property management platform for home watch and HOA companies
            </p>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center py-16">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Streamline Your Property Operations
          </h2>
          <p className="mt-4 text-xl text-slate-600 max-w-3xl mx-auto">
            Manage properties, coordinate tasks, collaborate with your team, and deliver exceptional service to your clients.
          </p>
          <div className="mt-8">
            <Button 
              onClick={handleLogin}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg"
            >
              Get Started
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="text-center">
                  <CardHeader>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center py-16 border-t border-slate-200">
          <h3 className="text-2xl font-bold text-slate-900">
            Ready to transform your property management?
          </h3>
          <p className="mt-4 text-lg text-slate-600">
            Join professional property managers who trust Nestive
          </p>
          <div className="mt-8">
            <Button 
              onClick={handleLogin}
              size="lg"
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Sign In to Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
