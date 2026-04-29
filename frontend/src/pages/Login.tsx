import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { loginSchema } from '../utils/validators';
import { LoginForm } from '../types';
import { Button } from '../components/ui/Button';
import { FormField } from '../components/ui/FormField';
import { Input } from '../components/ui/Input';
import { useState } from 'react';
import toast from 'react-hot-toast';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoginError(null);
    try {
      await login(data);
      navigate('/');
    } catch (err: unknown) {
      const error = err as { userMessage?: string; message?: string };
      setLoginError(error?.userMessage || error?.message || 'Identifiants incorrects');
    }
  };

  return (
    <div className="min-h-screen bg-banking-bg flex flex-col items-center justify-center p-4">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary via-primary-800 to-primary-900 opacity-95 z-0" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4 border border-white/20">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">RECOS-TRACKER</h1>
          <p className="mt-1.5 text-sm text-white/60 max-w-xs mx-auto">
            Plateforme de Suivi des Recommandations Bancaires
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-banking-text mb-6">Connexion</h2>

          {loginError && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-200 p-3">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{loginError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              label="Nom d'utilisateur"
              error={errors.username?.message}
              htmlFor="username"
              required
            >
              <Input
                id="username"
                {...register('username')}
                error={!!errors.username}
                placeholder="Entrez votre nom d'utilisateur"
                autoComplete="username"
                autoFocus
              />
            </FormField>

            <FormField
              label="Mot de passe"
              error={errors.password?.message}
              htmlFor="password"
              required
            >
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                error={!!errors.password}
                placeholder="Entrez votre mot de passe"
                autoComplete="current-password"
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
              />
            </FormField>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-600">Se souvenir de moi</span>
              </label>
              <button
                type="button"
                className="text-sm text-secondary hover:text-blue-700 transition-colors"
              >
                Mot de passe oublié ?
              </button>
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={isSubmitting}
              className="mt-2"
            >
              Se connecter
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          © {new Date().getFullYear()} RECOS-TRACKER. Accès réservé au personnel autorisé.
        </p>
      </div>
    </div>
  );
};
