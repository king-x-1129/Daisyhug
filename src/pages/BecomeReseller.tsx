import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { UserRole } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { Wallet } from 'lucide-react';

const resellerSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  mobile: z.string().min(11, "Valid primary mobile number is required"),
  mobile2: z.string().min(11, "Valid secondary mobile number is required"),
  city: z.string().min(2, "City is required"),
  province: z.string().min(2, "Province is required"),
  address: z.string().min(10, "Residential address is required"),
  permanentAddress: z.string().min(10, "Permanent address is required"),
  paymentMethod: z.enum(["Bank", "JazzCash", "Easypaisa"]),
  paymentDetails: z.string().min(5, "Payment details are required"),
  cnic: z.string().min(13, "Valid CNIC is required"),
  terms: z.boolean().refine(val => val === true, "You must accept terms"),
});

export function BecomeReseller() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve pre-filled data passed from AuthPage
  const stateData = location.state as { fullName?: string; email?: string; password?: string } | null;

  // Document Upload States
  const [cnicFront, setCnicFront] = useState<string>('');
  const [cnicBack, setCnicBack] = useState<string>('');

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<z.infer<typeof resellerSchema>>({
    resolver: zodResolver(resellerSchema),
    defaultValues: {
      fullName: stateData?.fullName || '',
      email: stateData?.email || '',
      password: stateData?.password || '',
      terms: false
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (limit to 1MB to prevent firestore size issues)
      if (file.size > 1024 * 1024) {
        toast.error("File size must be less than 1MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: z.infer<typeof resellerSchema>) => {
    if (!cnicFront || !cnicBack) {
      toast.error("Please upload CNIC Front and CNIC Back images for verification.");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        fullName: data.fullName,
        email: data.email,
        role: 'reseller' as UserRole,
        mobile: data.mobile,
        mobile2: data.mobile2,
        city: data.city,
        province: data.province,
        address: data.address,
        permanentAddress: data.permanentAddress,
        paymentInfo: {
          method: data.paymentMethod,
          details: data.paymentDetails
        },
        cnic: data.cnic,
        cnicFrontUrl: cnicFront,
        cnicBackUrl: cnicBack,
        isVerified: false,
        walletBalance: 0,
        pendingProfit: 0,
        totalWithdrawn: 0,
        createdAt: new Date().toISOString()
      });
      toast.success("Reseller registration successful! Welcome aboard.");
      navigate('/reseller');
    } catch (error: any) {
      if (error.code === 'auth/network-request-failed') {
        toast.error("Network Error: Please check your internet connection or disable ad-blockers.");
      } else if (error.code === 'auth/email-already-in-use') {
        toast.error("This email is already registered. Please login to your existing account.");
      } else {
        toast.error(error.message || "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-slate-900 dark:text-white">
      <PageHeader 
        title="Earn With Us" 
        subtitle="Join our reseller network and start your business today" 
        icon={Wallet} 
      />

      <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border dark:border-slate-800">
        <CardHeader className="bg-indigo-600 text-white p-8">
          <CardTitle className="text-2xl font-bold text-white font-sans">Reseller Application</CardTitle>
          <CardDescription className="text-indigo-150 dark:text-indigo-200 mt-1">Please provide accurate information for verification and payments.</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="dark:text-slate-300 font-bold">Full Name</Label>
                <Input {...register('fullName')} placeholder="Enter your full name" className="rounded-xl h-12 dark:bg-slate-800 dark:border-slate-750 dark:text-white focus-visible:ring-indigo-500" />
                {errors.fullName && <p className="text-xs text-rose-500">{errors.fullName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-300 font-bold">Email Address</Label>
                <Input type="email" {...register('email')} placeholder="email@example.com" className="rounded-xl h-12 dark:bg-slate-800 dark:border-slate-750 dark:text-white focus-visible:ring-indigo-500" />
                {errors.email && <p className="text-xs text-rose-500">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-300 font-bold">Password</Label>
                <Input type="password" {...register('password')} className="rounded-xl h-12 dark:bg-slate-800 dark:border-slate-750 dark:text-white focus-visible:ring-indigo-500" />
                {errors.password && <p className="text-xs text-rose-500">{errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-300 font-bold">Primary Mobile Number</Label>
                <Input {...register('mobile')} placeholder="03001234567" className="rounded-xl h-12 dark:bg-slate-800 dark:border-slate-750 dark:text-white focus-visible:ring-indigo-500" />
                {errors.mobile && <p className="text-xs text-rose-500">{errors.mobile.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-300 font-bold">Secondary Mobile / Landline</Label>
                <Input {...register('mobile2')} placeholder="03217654321" className="rounded-xl h-12 dark:bg-slate-800 dark:border-slate-750 dark:text-white focus-visible:ring-indigo-500" />
                {errors.mobile2 && <p className="text-xs text-rose-500">{errors.mobile2.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-300 font-bold">CNIC Number</Label>
                <Input {...register('cnic')} placeholder="4210112345671" className="rounded-xl h-12 dark:bg-slate-800 dark:border-slate-750 dark:text-white focus-visible:ring-indigo-500" />
                {errors.cnic && <p className="text-xs text-rose-500">{errors.cnic.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-300 font-bold">City</Label>
                <Input {...register('city')} placeholder="Karachi" className="rounded-xl h-12 dark:bg-slate-800 dark:border-slate-750 dark:text-white focus-visible:ring-indigo-500" />
                {errors.city && <p className="text-xs text-rose-500">{errors.city.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-300 font-bold">Province</Label>
                <Input {...register('province')} placeholder="Sindh" className="rounded-xl h-12 dark:bg-slate-800 dark:border-slate-750 dark:text-white focus-visible:ring-indigo-500" />
                {errors.province && <p className="text-xs text-rose-500">{errors.province.message}</p>}
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label className="dark:text-slate-300 font-bold">Residential Address</Label>
                <Input {...register('address')} placeholder="Residential House #, Street, Area" className="rounded-xl h-12 dark:bg-slate-800 dark:border-slate-750 dark:text-white focus-visible:ring-indigo-500" />
                {errors.address && <p className="text-xs text-rose-500">{errors.address.message}</p>}
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label className="dark:text-slate-300 font-bold">Permanent Address</Label>
                <Input {...register('permanentAddress')} placeholder="Permanent House #, Street, City" className="rounded-xl h-12 dark:bg-slate-800 dark:border-slate-750 dark:text-white focus-visible:ring-indigo-500" />
                {errors.permanentAddress && <p className="text-xs text-rose-500">{errors.permanentAddress.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-300 font-bold">Payment Method</Label>
                <Select onValueChange={(val: any) => setValue('paymentMethod', val)}>
                  <SelectTrigger className="rounded-xl h-12 dark:bg-slate-800 dark:border-slate-750 dark:text-white focus:ring-indigo-500">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectItem value="Bank" className="dark:text-white dark:focus:bg-slate-700">Bank Transfer</SelectItem>
                    <SelectItem value="JazzCash" className="dark:text-white dark:focus:bg-slate-700">JazzCash</SelectItem>
                    <SelectItem value="Easypaisa" className="dark:text-white dark:focus:bg-slate-700">Easypaisa</SelectItem>
                  </SelectContent>
                </Select>
                {errors.paymentMethod && <p className="text-xs text-rose-500">{errors.paymentMethod.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-300 font-bold">Payment Details (Acc # / IBAN)</Label>
                <Input {...register('paymentDetails')} placeholder="Account number or IBAN" className="rounded-xl h-12 dark:bg-slate-800 dark:border-slate-750 dark:text-white focus-visible:ring-indigo-500" />
                {errors.paymentDetails && <p className="text-xs text-rose-500">{errors.paymentDetails.message}</p>}
              </div>
            </div>

            {/* Document Verification Section */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Verification Documents</h3>
              <p className="text-xs text-slate-400">Please upload clear pictures of the following items for review.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="dark:text-slate-300 font-bold">CNIC Front Side</Label>
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 transition-all relative">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleFileChange(e, setCnicFront)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {cnicFront ? (
                      <img src={cnicFront} alt="CNIC Front" className="h-32 mx-auto rounded-lg object-cover" />
                    ) : (
                      <div className="py-6">
                        <p className="text-xs text-slate-400 font-bold">Click to Upload Image</p>
                        <p className="text-[10px] text-slate-400 mt-1">PNG, JPG up to 1MB</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="dark:text-slate-300 font-bold">CNIC Back Side</Label>
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 transition-all relative">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleFileChange(e, setCnicBack)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {cnicBack ? (
                      <img src={cnicBack} alt="CNIC Back" className="h-32 mx-auto rounded-lg object-cover" />
                    ) : (
                      <div className="py-6">
                        <p className="text-xs text-slate-400 font-bold">Click to Upload Image</p>
                        <p className="text-[10px] text-slate-400 mt-1">PNG, JPG up to 1MB</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-4">
              <Checkbox id="terms" checked={watch('terms')} onCheckedChange={(val: boolean) => setValue('terms', val)} className="dark:border-slate-600 dark:data-[state=checked]:bg-indigo-600 dark:data-[state=checked]:border-indigo-600" />
              <Label htmlFor="terms" className="text-sm font-medium text-slate-600 dark:text-slate-400">
                I agree to the <span className="text-indigo-600 hover:underline cursor-pointer">Terms & Conditions</span>
              </Label>
            </div>
            {errors.terms && <p className="text-xs text-rose-500">{errors.terms.message}</p>}

            <Button type="submit" disabled={loading} className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none border-none transition-all">
              {loading ? "Processing Registration..." : "Complete Registration"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
