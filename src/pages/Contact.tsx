import { Mail, Phone, MapPin, Send, MessageSquare, Clock } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { toast } from 'sonner';

export function Contact() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      toast.success("Message sent! We'll get back to you soon.");
      setIsSubmitting(false);
      (e.target as HTMLFormElement).reset();
    }, 1500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <PageHeader 
        title="Get in Touch" 
        subtitle="Our team is here to support you 24/7" 
        icon={MessageSquare} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Contact Info Cards */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Email Us</h3>
            <p className="text-slate-500 mb-4">Drop us a line anytime.</p>
            <a href="mailto:support@reselleasepk.com" className="text-indigo-600 font-bold hover:underline">
              support@reselleasepk.com
            </a>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-6">
              <Phone className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Call Us</h3>
            <p className="text-slate-500 mb-4">Mon-Fri from 9am to 6pm.</p>
            <a href="tel:+923001234567" className="text-emerald-600 font-bold hover:underline">
              +92 300 1234567
            </a>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-6">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Support Hours</h3>
            <p className="text-slate-500">
              Our AI Assistant is available 24/7. Human support is available during business hours.
            </p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2">
          <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-8">
              <MessageSquare className="w-6 h-6 text-indigo-600" />
              <h2 className="text-2xl font-black text-slate-900">Send us a Message</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-bold text-slate-700">Full Name</Label>
                  <Input 
                    id="name" 
                    required 
                    placeholder="John Doe" 
                    className="rounded-xl h-12 border-slate-200 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-bold text-slate-700">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    required 
                    placeholder="john@example.com" 
                    className="rounded-xl h-12 border-slate-200 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject" className="font-bold text-slate-700">Subject</Label>
                <Input 
                  id="subject" 
                  required 
                  placeholder="How can we help?" 
                  className="rounded-xl h-12 border-slate-200 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="font-bold text-slate-700">Message</Label>
                <Textarea 
                  id="message" 
                  required 
                  placeholder="Tell us more about your inquiry..." 
                  className="rounded-2xl min-h-[150px] border-slate-200 focus:ring-indigo-500 p-4"
                />
              </div>

              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 transition-all text-lg"
              >
                {isSubmitting ? (
                  "Sending..."
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Map or Additional Info */}
      <div className="mt-16 bg-slate-900 rounded-3xl p-12 text-center text-white overflow-hidden relative">
        <div className="relative z-10">
          <MapPin className="w-12 h-12 text-indigo-400 mx-auto mb-6" />
          <h2 className="text-3xl font-black mb-4">Our Headquarters</h2>
          <p className="text-slate-400 text-lg max-w-md mx-auto">
            123 Business Avenue, Tech District<br />
            Lahore, Punjab, Pakistan
          </p>
        </div>
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full -ml-32 -mb-32 blur-3xl" />
      </div>
    </div>
  );
}
