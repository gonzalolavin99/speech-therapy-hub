import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info, Shield, FileText, Scale, Heart } from "lucide-react";

export default function Legal() {
  const [activeTab, setActiveTab] = useState("about");

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Información Legal</h1>
          <p className="text-muted-foreground mt-1">
            Políticas, términos y condiciones de TherapyHub
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="about" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span className="hidden sm:inline">Acerca de</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Privacidad</span>
            </TabsTrigger>
            <TabsTrigger value="terms" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Términos</span>
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              <span className="hidden sm:inline">Datos</span>
            </TabsTrigger>
          </TabsList>

          {/* ACERCA DE */}
          <TabsContent value="about" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  Acerca de TherapyHub
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <h3>¿Qué es TherapyHub?</h3>
                <p>
                  TherapyHub es una plataforma digital diseñada para profesionales 
                  de la salud (fonoaudiólogos, psicólogos y más). Nuestra misión es simplificar la gestión clínica, 
                  permitiendo a los profesionales enfocarse en lo más importante: sus pacientes.
                </p>

                <h3>Características Principales</h3>
                <ul>
                  <li><strong>Gestión de Pacientes:</strong> Registro completo de información clínica, historial y evolución.</li>
                  <li><strong>Tests Estandarizados:</strong> Aplicación de pruebas como MBGR, TAR y TEPROSIF-R con resultados automáticos.</li>
                  <li><strong>Planificaciones:</strong> Creación y seguimiento de planes de intervención terapéutica.</li>
                  <li><strong>Agenda y Recordatorios:</strong> Gestión de citas con recordatorios vía WhatsApp o email.</li>
                  <li><strong>Pagos:</strong> Control de pagos y estados de cuenta de pacientes.</li>
                </ul>

                <h3>Compromiso con la Privacidad</h3>
                <p>
                  Entendemos la sensibilidad de los datos de salud. TherapyHub implementa las 
                  más altas medidas de seguridad para proteger la información de tus pacientes, 
                  cumpliendo con las normativas vigentes de protección de datos personales.
                </p>

                <h3>Versión</h3>
                <p>
                  <strong>Versión:</strong> 1.0.0<br />
                  <strong>Última actualización:</strong> Febrero 2026
                </p>

                <h3>Contacto</h3>
                <p>
                  Para consultas, sugerencias o soporte técnico:<br />
                  <strong>Email:</strong> soporte@therapyhub.cl
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* POLÍTICA DE PRIVACIDAD */}
          <TabsContent value="privacy" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Política de Privacidad
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p className="text-muted-foreground">Última actualización: Febrero 2026</p>

                <h3>1. Información que Recopilamos</h3>
                <p>TherapyHub recopila la siguiente información:</p>
                <ul>
                  <li><strong>Datos del profesional:</strong> Nombre, email, teléfono, RUT, institución.</li>
                  <li><strong>Datos de pacientes:</strong> Nombre, RUT, fecha de nacimiento, diagnóstico, historial clínico.</li>
                  <li><strong>Datos de sesiones:</strong> Fechas, notas clínicas, resultados de evaluaciones.</li>
                </ul>

                <h3>2. Uso de la Información</h3>
                <p>La información recopilada se utiliza exclusivamente para:</p>
                <ul>
                  <li>Proveer los servicios de gestión clínica de la plataforma.</li>
                  <li>Enviar recordatorios de citas a pacientes (con autorización).</li>
                  <li>Mejorar la experiencia del usuario y funcionalidades.</li>
                </ul>

                <h3>3. Almacenamiento y Seguridad</h3>
                <ul>
                  <li>Los datos se almacenan en servidores seguros con encriptación.</li>
                  <li>Implementamos Row Level Security (RLS) para que cada profesional solo acceda a sus propios datos.</li>
                  <li>Las contraseñas se almacenan con hash seguro (nunca en texto plano).</li>
                  <li>Usamos conexiones HTTPS para todas las comunicaciones.</li>
                </ul>

                <h3>4. Compartir Información</h3>
                <p>
                  <strong>No vendemos ni compartimos</strong> información personal con terceros, 
                  excepto cuando sea requerido por ley o con consentimiento expreso del usuario.
                </p>

                <h3>5. Derechos del Usuario</h3>
                <p>Tienes derecho a:</p>
                <ul>
                  <li>Acceder a tus datos personales.</li>
                  <li>Rectificar información incorrecta.</li>
                  <li>Solicitar la eliminación de tus datos.</li>
                  <li>Exportar tus datos en formato legible.</li>
                </ul>

                <h3>6. Retención de Datos</h3>
                <p>
                  Los datos se conservan mientras la cuenta esté activa. Al eliminar la cuenta, 
                  los datos se eliminan permanentemente dentro de 30 días.
                </p>

                <h3>7. Cookies y Tecnologías Similares</h3>
                <p>
                  Usamos almacenamiento local (localStorage) para preferencias de usuario y 
                  sesión de autenticación. No usamos cookies de seguimiento de terceros.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TÉRMINOS Y CONDICIONES */}
          <TabsContent value="terms" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Términos y Condiciones de Uso
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p className="text-muted-foreground">Última actualización: Febrero 2026</p>

                <h3>1. Aceptación de los Términos</h3>
                <p>
                  Al acceder y utilizar TherapyHub, aceptas estos términos y condiciones en su totalidad. 
                  Si no estás de acuerdo, no debes utilizar la plataforma.
                </p>

                <h3>2. Descripción del Servicio</h3>
                <p>
                  TherapyHub es una herramienta de gestión clínica para profesionales de la 
                  salud. El servicio incluye gestión de pacientes, evaluaciones, 
                  planificaciones y agenda.
                </p>

                <h3>3. Requisitos de Uso</h3>
                <ul>
                  <li>Debes ser un profesional de la salud habilitado para ejercer.</li>
                  <li>Eres responsable de la veracidad de la información ingresada.</li>
                  <li>Debes obtener el consentimiento de tus pacientes para registrar sus datos.</li>
                  <li>No debes compartir tu cuenta con terceros.</li>
                </ul>

                <h3>4. Responsabilidades del Usuario</h3>
                <ul>
                  <li>Mantener la confidencialidad de tu contraseña.</li>
                  <li>Cumplir con las leyes de protección de datos vigentes.</li>
                  <li>Obtener consentimiento informado de los pacientes.</li>
                  <li>No usar la plataforma para fines ilegales o no autorizados.</li>
                </ul>

                <h3>5. Propiedad Intelectual</h3>
                <p>
                  Todos los contenidos de TherapyHub (diseño, código, textos, logos) son propiedad 
                  exclusiva de TherapyHub y están protegidos por derechos de autor.
                </p>

                <h3>6. Limitación de Responsabilidad</h3>
                <ul>
                  <li>TherapyHub es una herramienta de apoyo, no reemplaza el juicio clínico profesional.</li>
                  <li>No nos responsabilizamos por decisiones clínicas basadas en la plataforma.</li>
                  <li>No garantizamos disponibilidad ininterrumpida del servicio.</li>
                </ul>

                <h3>7. Modificaciones</h3>
                <p>
                  Nos reservamos el derecho de modificar estos términos. Los cambios se 
                  notificarán a través de la plataforma.
                </p>

                <h3>8. Terminación</h3>
                <p>
                  Podemos suspender o terminar tu acceso si incumples estos términos o 
                  si detectamos uso indebido de la plataforma.
                </p>

                <h3>9. Ley Aplicable</h3>
                <p>
                  Estos términos se rigen por las leyes de la República de Chile.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TRATAMIENTO DE DATOS */}
          <TabsContent value="data" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-primary" />
                  Tratamiento de Datos de Pacientes
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p className="text-muted-foreground">
                  Información sobre el manejo de datos sensibles de salud
                </p>

                <h3>1. Marco Legal</h3>
                <p>
                  El tratamiento de datos de pacientes se realiza conforme a:
                </p>
                <ul>
                  <li>Ley 19.628 sobre Protección de la Vida Privada (Chile)</li>
                  <li>Ley 20.584 sobre Derechos y Deberes de los Pacientes</li>
                  <li>Normas éticas de los colegios profesionales correspondientes</li>
                </ul>

                <h3>2. Datos Sensibles de Salud</h3>
                <p>
                  Los datos de salud son considerados <strong>datos sensibles</strong> y reciben 
                  protección especial:
                </p>
                <ul>
                  <li>Solo el profesional tratante puede acceder a los datos de sus pacientes.</li>
                  <li>Los datos están encriptados en tránsito y en reposo.</li>
                  <li>No se comparten con terceros sin consentimiento expreso.</li>
                </ul>

                <h3>3. Consentimiento Informado</h3>
                <p>
                  Es <strong>obligación del profesional</strong> obtener el consentimiento 
                  informado del paciente (o su representante legal) antes de:
                </p>
                <ul>
                  <li>Registrar sus datos en la plataforma.</li>
                  <li>Almacenar resultados de evaluaciones.</li>
                  <li>Enviar recordatorios por WhatsApp o email.</li>
                </ul>

                <h3>4. Derechos ARCO de los Pacientes</h3>
                <p>Los pacientes tienen derecho a:</p>
                <ul>
                  <li><strong>Acceso:</strong> Conocer qué datos se almacenan sobre ellos.</li>
                  <li><strong>Rectificación:</strong> Corregir datos incorrectos.</li>
                  <li><strong>Cancelación:</strong> Solicitar eliminación de sus datos.</li>
                  <li><strong>Oposición:</strong> Negarse al tratamiento de sus datos.</li>
                </ul>

                <h3>5. Responsabilidad del Profesional</h3>
                <p>
                  El profesional que utiliza TherapyHub es el <strong>responsable del tratamiento</strong> 
                  de los datos de sus pacientes. TherapyHub actúa como <strong>encargado del tratamiento</strong>, 
                  procesando los datos según las instrucciones del profesional.
                </p>

                <h3>6. Medidas de Seguridad Implementadas</h3>
                <ul>
                  <li>Autenticación segura con contraseñas hasheadas</li>
                  <li>Row Level Security (RLS) a nivel de base de datos</li>
                  <li>Cifrado TLS/SSL en todas las comunicaciones</li>
                  <li>Backups automáticos encriptados</li>
                  <li>Auditoría de accesos (logs)</li>
                </ul>

                <h3>7. Notificación de Brechas</h3>
                <p>
                  En caso de una brecha de seguridad que afecte datos personales, 
                  notificaremos a los usuarios afectados dentro de 72 horas.
                </p>

                <h3>8. Contacto para Ejercer Derechos</h3>
                <p>
                  Para ejercer los derechos ARCO o realizar consultas sobre el 
                  tratamiento de datos:<br />
                  <strong>Email:</strong> privacidad@therapyhub.cl
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
