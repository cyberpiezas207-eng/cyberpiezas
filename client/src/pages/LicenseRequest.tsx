import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function LicenseRequest() {
  const [step, setStep] = useState<'info' | 'form' | 'confirmation'>('info');
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '', // retail, bazaar, secondhand, other
    numberOfBranches: 1,
    description: '',
    email: '',
    phone: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'numberOfBranches' ? parseInt(value) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí iría la lógica para enviar la solicitud
    setStep('confirmation');
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {step === 'info' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Solicitud de Licencias
              </CardTitle>
              <CardDescription>
                Antes de suscribirse, necesitamos verificar la disponibilidad de licencias para tu negocio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Límite de sucursales:</strong> El plan estándar incluye hasta 3 sucursales. Si necesitas más, contacta directamente con nosotros.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">¿Cuántas sucursales necesitas?</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map(num => (
                    <Button
                      key={num}
                      variant={formData.numberOfBranches === num ? 'default' : 'outline'}
                      onClick={() => setFormData(prev => ({ ...prev, numberOfBranches: num }))}
                      className="h-20 text-lg"
                    >
                      {num} {num === 1 ? 'Sucursal' : 'Sucursales'}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setFormData(prev => ({ ...prev, numberOfBranches: 4 }))}
                  className="w-full"
                >
                  Más de 3 sucursales (contactar)
                </Button>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Tipo de negocio</h3>
                <select
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Selecciona tu tipo de negocio</option>
                  <option value="retail">Tienda de ropa nueva</option>
                  <option value="bazaar">Bazar/Tienda mixta</option>
                  <option value="secondhand">Ropa reutilizada/Vintage</option>
                  <option value="sustainable">Negocio sostenible/Ecológico</option>
                  <option value="other">Otro</option>
                </select>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Información adicional</h3>
                <p className="text-sm text-gray-600">
                  Si tu negocio es de ropa reutilizada, bazar o tiene enfoque ecológico, cuéntanos más para explorar convenios especiales. Las licencias gratuitas o especiales pueden requerir suscripción al canal de YouTube de CyberPiezas, seguimiento en Facebook y compartir ambos perfiles como parte del convenio.
                </p>
                <Textarea
                  name="description"
                  placeholder="Describe tu negocio..."
                  value={formData.description}
                  onChange={handleInputChange}
                  className="min-h-24"
                />
              </div>

              <Button
                onClick={() => setStep('form')}
                disabled={!formData.businessType}
                className="w-full"
                size="lg"
              >
                Continuar con Solicitud
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'form' && (
          <Card>
            <CardHeader>
              <CardTitle>Completa tu Solicitud</CardTitle>
              <CardDescription>
                Necesitamos estos datos para procesar tu solicitud de licencia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Nombre del Negocio</label>
                  <Input
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    placeholder="Ej: Mi Boutique"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="tu@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Teléfono</label>
                  <Input
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+52 XXXXXXXXXX"
                    required
                  />
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Revisaremos tu solicitud en las próximas 24 horas y nos pondremos en contacto contigo.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('info')}
                    className="flex-1"
                  >
                    Atrás
                  </Button>
                  <Button type="submit" className="flex-1">
                    Enviar Solicitud
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'confirmation' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-5 h-5" />
                Solicitud Enviada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800">
                  ¡Gracias por tu solicitud! Hemos recibido tu información correctamente.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Próximos pasos:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Revisaremos tu solicitud en las próximas 24 horas</li>
                  <li>Te contactaremos al email o WhatsApp que proporcionaste</li>
                  <li>Si necesitas más sucursales, discutiremos opciones especiales</li>
                  <li>Recibirás tu acceso y contraseña automáticamente</li>
                </ol>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    <strong>¿Negocio sostenible?</strong> Si tu negocio es de ropa reutilizada o tiene enfoque ecológico, podemos explorar convenios especiales. Cuando aplique una licencia gratuita o especial, validaremos también la suscripción a YouTube, el seguimiento en Facebook y la compartición de ambos perfiles antes de autorizarla.

                </AlertDescription>
              </Alert>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Contacto directo:</strong> Si tienes preguntas, puedes contactarnos por WhatsApp al <strong>7354946224</strong> o al correo <strong>cyberpiezas207@gmail.com</strong>
                </p>
              </div>

              <Button onClick={() => setStep('info')} className="w-full">
                Nueva Solicitud
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
