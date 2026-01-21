import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { Store } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register form state
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerRole, setRegisterRole] = useState<'owner' | 'karyawan'>('karyawan');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const { error } = await signIn(loginEmail, loginPassword);
    
    if (error) {
      toast.error('Login gagal', { description: error.message });
    } else {
      toast.success('Berhasil masuk!');
      navigate('/');
    }
    
    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const { error } = await signUp(registerEmail, registerPassword, registerName, registerRole);
    
    if (error) {
      toast.error('Registrasi gagal', { description: error.message });
    } else {
      toast.success('Akun berhasil dibuat!', { description: 'Silakan login.' });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo & Branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Store className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Booth Finance</h1>
          <p className="text-muted-foreground">Kelola keuangan booth dengan mudah</p>
        </div>

        <Card className="border-0 shadow-lg">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Masuk</TabsTrigger>
                <TabsTrigger value="register">Daftar</TabsTrigger>
              </TabsList>
            </CardHeader>
            
            <CardContent>
              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="email@contoh.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className="field-mobile"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className="field-mobile"
                    />
                  </div>
                  <Button type="submit" className="w-full py-6 text-base font-semibold" disabled={isLoading}>
                    {isLoading ? <Spinner size="sm" className="text-primary-foreground" /> : 'Masuk'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register" className="mt-0">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Nama</Label>
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="Nama lengkap"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      required
                      className="field-mobile"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="email@contoh.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                      className="field-mobile"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Minimal 6 karakter"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required
                      minLength={6}
                      className="field-mobile"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-role">Role</Label>
                    <Select value={registerRole} onValueChange={(v) => setRegisterRole(v as 'owner' | 'karyawan')}>
                      <SelectTrigger className="field-mobile">
                        <SelectValue placeholder="Pilih role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="karyawan">Karyawan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full py-6 text-base font-semibold" disabled={isLoading}>
                    {isLoading ? <Spinner size="sm" className="text-primary-foreground" /> : 'Daftar'}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
