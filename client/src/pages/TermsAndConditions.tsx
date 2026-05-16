import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Check, CheckCircle2, ScrollText } from "lucide-react";
import { toast } from "sonner";

const TERMS_ACCEPTED_KEY = "boutique-pos-terms-accepted";
const TERMS_VERSION = "1.0";
const TERMS_DATE = "16 de mayo de 2026";

export default function TermsAndConditions() {
  const [, setLocation] = useLocation();
  const auth = useAuth() as any;
  const isAuthenticated = auth?.isAuthenticated;
  const [hasReadAll, setHasReadAll] = useState(false);
  const [checkboxAccepted, setCheckboxAccepted] = useState(false);

  // Cargar Google Fonts (estilo pergamino)
  useEffect(() => {
    const linkId = "terms-fonts-link";
    if (document.getElementById(linkId)) return;
    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Crimson+Pro:ital,wght@0,400;0,500;0,600;1,400&display=swap";
    document.head.appendChild(link);
  }, []);

  const termsStatusQuery = trpc.users.getTermsStatus.useQuery(undefined, {
    enabled: Boolean(auth?.user),
    staleTime: 300_000,
  });
  const acceptTermsMutation = trpc.users.acceptTerms.useMutation({
    onSuccess: () => {
      termsStatusQuery.refetch();
      if (typeof window !== "undefined") {
        window.localStorage.setItem(TERMS_ACCEPTED_KEY, "true");
      }
      toast.success("Términos aceptados — bienvenido a CyberPiezas");
      setTimeout(() => setLocation("/cyberpiezas"), 1500);
    },
    onError: (err: any) => {
      toast.error("Error: " + (err?.message ?? "no se pudo guardar"));
    },
  });

  // Detector de scroll: si llega al fondo, habilita el botón
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + window.innerHeight;
      const totalHeight = document.documentElement.scrollHeight;
      // 95% del contenido para no exigir scroll exacto al pixel
      if (scrollPos >= totalHeight * 0.95) {
        setHasReadAll(true);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const alreadyAccepted = termsStatusQuery.data?.accepted === true;
  const acceptedAt = termsStatusQuery.data?.acceptedAt;

  const handleAccept = () => {
    if (!isAuthenticated) {
      toast.error("Inicia sesión primero para aceptar los términos");
      return;
    }
    if (!checkboxAccepted) {
      toast.error("Marca la casilla de aceptación primero");
      return;
    }
    acceptTermsMutation.mutate();
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        fontFamily: "'Crimson Pro', Georgia, serif",
        backgroundColor: "#f5ead3",
        backgroundImage: `
          radial-gradient(circle at 20% 30%, rgba(180, 140, 80, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(120, 90, 50, 0.06) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(200, 160, 100, 0.04) 0%, transparent 70%)
        `,
      }}
    >
      {/* Textura de papel sutil */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 2px,
              rgba(139, 90, 43, 0.03) 2px,
              rgba(139, 90, 43, 0.03) 4px
            )
          `,
        }}
      />

      {/* Botón volver flotante */}
      <button
        onClick={() => window.history.back()}
        className="fixed top-4 left-4 z-30 flex items-center gap-2 px-4 py-2 bg-amber-900/90 text-amber-50 rounded-full shadow-lg hover:bg-amber-900 transition-colors text-sm backdrop-blur"
        style={{ fontFamily: "'Crimson Pro', serif" }}
      >
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      {/* Banner de aceptación previa */}
      {alreadyAccepted && (
        <div className="fixed top-4 right-4 z-30 flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-full shadow-lg text-sm">
          <CheckCircle2 className="w-4 h-4" />
          <span>Aceptado{acceptedAt ? ` el ${new Date(acceptedAt).toLocaleDateString("es-MX")}` : ""}</span>
        </div>
      )}

      <div className="relative max-w-3xl mx-auto px-6 py-12 md:py-20">
        {/* Pergamino con bordes ornamentados */}
        <div
          className="relative bg-[#fdf6e3] rounded-sm shadow-2xl px-8 md:px-16 py-12 md:py-20"
          style={{
            boxShadow:
              "0 30px 80px -20px rgba(101, 67, 33, 0.4), 0 0 0 1px rgba(139, 90, 43, 0.2), inset 0 0 60px rgba(180, 140, 80, 0.1)",
          }}
        >
          {/* Borde decorativo externo */}
          <div className="absolute inset-3 border border-amber-900/30 rounded-sm pointer-events-none" />
          <div className="absolute inset-5 border border-amber-900/20 rounded-sm pointer-events-none" />

          {/* Esquinas ornamentales */}
          <div className="absolute top-2 left-2 text-amber-900/40 text-xl select-none">❦</div>
          <div className="absolute top-2 right-2 text-amber-900/40 text-xl select-none">❦</div>
          <div className="absolute bottom-2 left-2 text-amber-900/40 text-xl select-none">❦</div>
          <div className="absolute bottom-2 right-2 text-amber-900/40 text-xl select-none">❦</div>

          {/* CABECERA */}
          <div className="text-center mb-10 relative">
            <div className="flex justify-center mb-4">
              <ScrollText className="w-12 h-12 text-amber-900" strokeWidth={1.2} />
            </div>
            <div
              className="text-xs uppercase tracking-[0.4em] text-amber-800/80 mb-3"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              ✦  CyberPiezas  ✦
            </div>
            <h1
              className="text-3xl md:text-5xl font-bold text-amber-950 leading-tight mb-3"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Términos y Condiciones
            </h1>
            <div className="text-amber-900/70 italic text-sm md:text-base">
              Acuerdo de Servicio y Suscripción
            </div>
            <div className="mt-6 flex items-center justify-center gap-3 text-xs text-amber-800/70">
              <span className="h-px w-12 bg-amber-900/30" />
              <span>
                Versión {TERMS_VERSION}  •  Vigente desde el {TERMS_DATE}
              </span>
              <span className="h-px w-12 bg-amber-900/30" />
            </div>
          </div>

          {/* PREÁMBULO */}
          <div className="mb-10 text-amber-950 leading-relaxed">
            <p className="text-base md:text-lg italic text-center text-amber-900/80">
              El presente acuerdo se celebra entre <strong>CyberPiezas</strong>, representada
              por su titular el C. David Antonio Farfán Gómez, con domicilio en el Estado
              de Morelos, México, en lo sucesivo "el Proveedor"; y el usuario suscriptor
              de los servicios, en lo sucesivo "el Cliente", quienes manifiestan su
              voluntad de obligarse conforme a las siguientes cláusulas.
            </p>
            <div className="text-center my-6 text-amber-900/40 text-2xl select-none">❦  ✦  ❦</div>
          </div>

          {/* CLÁUSULAS */}
          <Clause numeral="I" title="Del Objeto del Contrato">
            <p>
              <DropCap>E</DropCap>l presente acuerdo tiene por objeto regular el uso de la
              plataforma tecnológica <em>CyberPiezas</em>, la cual comprende sistemas de
              punto de venta (POS), gestión de inventarios, administración de clientes,
              herramientas de facturación, y servicios complementarios para boutiques,
              veterinarias, abarrotes, verdulerías y plataformas para artistas (Tarima),
              ofrecidos bajo la modalidad de <em>Software como Servicio</em> (SaaS).
            </p>
          </Clause>

          <Clause numeral="II" title="De las Obligaciones del Proveedor">
            <p>
              <DropCap>E</DropCap>l Proveedor se compromete a poner a disposición del
              Cliente la plataforma con disponibilidad bajo la modalidad de "mejor
              esfuerzo razonable", sin garantizar el cien por ciento (100%) de
              continuidad operativa. Brindará soporte técnico a través de los canales
              oficiales: <strong>correo electrónico</strong> (cyberpiezas207@gmail.com)
              y <strong>WhatsApp</strong>, con un tiempo de respuesta estimado de
              <strong> veinticuatro (24) a setenta y dos (72) horas hábiles</strong>
              según la complejidad y volumen de solicitudes. El Proveedor realizará
              actualizaciones periódicas al sistema, las cuales podrán implementarse
              sin previo aviso siempre que no impliquen pérdida material de
              funcionalidad para el Cliente.
            </p>
          </Clause>

          <Clause numeral="III" title="De las Obligaciones del Cliente">
            <p>
              <DropCap>E</DropCap>l Cliente se obliga a: <em>(a)</em> efectuar los pagos
              en tiempo y forma; <em>(b)</em> proporcionar información veraz al momento
              del registro; <em>(c)</em> custodiar sus credenciales de acceso, siendo el
              único responsable de toda actividad realizada con ellas;
              <em> (d)</em> abstenerse de utilizar la plataforma para fines ilícitos,
              fraudulentos o contrarios a la moral;
              <em> (e)</em> no copiar, modificar, descompilar, ni redistribuir el
              software o cualquier parte de él; <em>(f)</em> realizar respaldos
              periódicos de la información que considere crítica, siendo de su exclusiva
              responsabilidad la pérdida derivada de no hacerlo.
            </p>
          </Clause>

          <Clause numeral="IV" title="Del Pago, Cobro y Garantía de Satisfacción">
            <p>
              <DropCap>L</DropCap>os planes de suscripción se cobran de forma mensual o
              anual según la modalidad elegida. Los precios vigentes son los publicados
              en el sitio web oficial al momento de la contratación. El Proveedor podrá
              ofrecer descuentos promocionales en fechas específicas (días 7 y 20 de
              cada mes) para suscripciones mensuales. Los pagos se realizan mediante
              transferencia bancaria o plataformas digitales autorizadas, y deberán
              acreditarse en los datos bancarios proporcionados al momento del checkout.
            </p>
            <p className="mt-4">
              <strong>Garantía de satisfacción de veinticuatro (24) horas:</strong> el
              Cliente podrá solicitar el reembolso íntegro de su pago únicamente dentro
              de las primeras veinticuatro (24) horas naturales contadas a partir de la
              activación del servicio, siempre que la solicitud sea expresa, por escrito,
              y mediante los canales oficiales del Proveedor. Transcurrido dicho plazo,
              <strong> los pagos efectuados no son reembolsables</strong> bajo ningún
              concepto, salvo error grave imputable exclusivamente al Proveedor.
            </p>
          </Clause>

          <Clause numeral="V" title="De la Vigencia, Renovación y Cancelación">
            <p>
              <DropCap>L</DropCap>a suscripción se renueva automáticamente al término de
              cada período (mensual o anual), salvo notificación expresa de cancelación
              por parte del Cliente con al menos siete (7) días naturales de
              anticipación al vencimiento. La falta de pago al cabo de tres (3) días
              naturales después del vencimiento dará lugar a la suspensión del servicio,
              y a los treinta (30) días, a la baja definitiva y eliminación de los
              datos. <strong>En el caso de suscripciones anuales</strong>, la
              cancelación anticipada no genera derecho a reembolso del saldo restante;
              el Cliente podrá continuar usando el servicio hasta el término del
              período pagado. El Cliente contará con un plazo de
              <strong> treinta (30) días</strong> posteriores a la cancelación para
              solicitar la exportación de sus datos.
            </p>
          </Clause>

          <Clause numeral="VI" title="De la Propiedad Intelectual">
            <p>
              <DropCap>L</DropCap>a totalidad del software, código fuente, diseño,
              marca, logotipos y materiales de la plataforma <em>CyberPiezas</em> son
              propiedad exclusiva del Proveedor y se encuentran protegidos por la Ley
              Federal del Derecho de Autor y la Ley de la Propiedad Industrial. El
              Cliente recibe únicamente una <em>licencia de uso</em>, no exclusiva,
              intransferible y revocable, limitada a la vigencia de su suscripción. La
              información ingresada por el Cliente (productos, ventas, clientes,
              imágenes) es de su propiedad y podrá exportarla en cualquier momento.
            </p>
          </Clause>

          <Clause numeral="VII" title="De la Privacidad y Protección de Datos">
            <p>
              <DropCap>E</DropCap>l Proveedor recopila, almacena y trata los datos
              personales del Cliente conforme a la <em>Ley Federal de Protección de
              Datos Personales en Posesión de los Particulares</em> (LFPDPPP) vigente
              en los Estados Unidos Mexicanos. Los datos serán utilizados únicamente
              para la prestación del servicio, soporte técnico, facturación y
              comunicaciones operacionales. <strong>El Proveedor no comercializa,
              cede ni transfiere los datos del Cliente a terceros</strong>, salvo
              requerimiento de autoridad competente o necesidad operacional para
              proveedores de infraestructura (servicios de almacenamiento en la nube),
              quienes se sujetan a obligaciones de confidencialidad equivalentes.
            </p>
          </Clause>

          <Clause numeral="VIII" title="De la Limitación de Responsabilidad">
            <p>
              <DropCap>E</DropCap>l Proveedor no será responsable por: <em>(a)</em>
              daños indirectos, consecuenciales, lucro cesante o pérdida de
              oportunidades comerciales; <em>(b)</em> interrupciones causadas por fallas
              de la red eléctrica, conectividad a internet, o servicios de terceros;
              <em> (c)</em> pérdida de datos derivada de la omisión del Cliente en
              realizar respaldos; <em>(d)</em> usos indebidos del software por parte del
              Cliente o sus empleados; <em>(e)</em> caso fortuito o fuerza mayor
              (desastres naturales, conflictos armados, pandemias, actos de autoridad).
              <strong> La responsabilidad máxima del Proveedor</strong>, bajo cualquier
              causa, queda limitada al equivalente de los pagos realizados por el
              Cliente durante los tres (3) meses inmediatos anteriores al evento que
              origine la reclamación.
            </p>
          </Clause>

          <Clause numeral="IX" title="De las Modificaciones al Acuerdo">
            <p>
              <DropCap>E</DropCap>l Proveedor se reserva el derecho de modificar los
              presentes términos y condiciones, así como las características del
              servicio y los precios. Toda modificación será notificada al Cliente con
              al menos <strong>quince (15) días naturales</strong> de anticipación, a
              través del correo electrónico registrado o mediante aviso publicado en la
              plataforma. La continuación en el uso del servicio tras la entrada en
              vigor de las modificaciones implica aceptación tácita de las mismas. Si
              el Cliente no estuviera de acuerdo, podrá cancelar su suscripción sin
              penalización dentro del período de aviso.
            </p>
          </Clause>

          <Clause numeral="X" title="De la Jurisdicción y Ley Aplicable">
            <p>
              <DropCap>P</DropCap>ara la interpretación y cumplimiento del presente
              acuerdo, las partes se someten expresamente a las leyes de los Estados
              Unidos Mexicanos y a la jurisdicción de los tribunales competentes del
              <strong> Estado de Morelos, México</strong>, renunciando a cualquier otro
              fuero que pudiera corresponderles en razón de su domicilio presente o
              futuro.
            </p>
          </Clause>

          <Clause numeral="XI" title="De la Aceptación Electrónica">
            <p>
              <DropCap>L</DropCap>a aceptación del presente acuerdo se realiza por medios
              electrónicos, conforme a lo establecido en el Código de Comercio y la Ley
              de Firma Electrónica Avanzada de los Estados Unidos Mexicanos. Al marcar
              la casilla de aceptación y oprimir el botón correspondiente, el Cliente
              manifiesta su consentimiento expreso e informado, quedando vinculado
              jurídicamente. El Proveedor conservará registro electrónico de la
              aceptación (fecha, hora e identificador del usuario) como prueba de la
              celebración del acuerdo.
            </p>
          </Clause>

          <Clause numeral="XII" title="De la Resolución de Controversias y Arbitraje">
            <p>
              <DropCap>L</DropCap>as partes acuerdan que, en caso de surgir cualquier
              controversia, diferencia o reclamación derivada del presente acuerdo,
              intentarán resolverla primeramente mediante <strong>negociación directa
              y de buena fe</strong> dentro de los treinta (30) días naturales
              siguientes a la notificación escrita de la controversia. Si no se
              alcanzara acuerdo, las partes podrán someterse, de común consentimiento,
              a <strong>procedimiento de mediación o arbitraje</strong> ante la Cámara
              Nacional de Comercio (CANACO) o institución equivalente. Únicamente
              agotadas estas instancias, podrá acudirse a los tribunales competentes
              señalados en la cláusula X. Esta cláusula tiene por objeto evitar la
              judicialización innecesaria de diferencias menores y preservar la
              relación comercial.
            </p>
          </Clause>

          <Clause numeral="XIII" title="De las Cookies y Tecnologías de Rastreo">
            <p>
              <DropCap>L</DropCap>a plataforma utiliza cookies y tecnologías similares
              para su correcto funcionamiento, las cuales se clasifican en:
              <em> (a) Cookies técnicas necesarias</em>, indispensables para la
              prestación del servicio (sesión, autenticación, preferencias),
              cuyo uso no requiere consentimiento expreso;
              <em> (b) Cookies analíticas</em>, utilizadas para medir el desempeño y
              uso de la plataforma de forma agregada y anónima;
              <em> (c) Cookies de terceros</em>, provenientes de proveedores de
              infraestructura (servicios de almacenamiento en la nube y procesamiento
              de pagos), sujetos a sus propias políticas. El Cliente podrá administrar
              o eliminar las cookies desde la configuración de su navegador,
              entendiendo que ello podrá afectar la funcionalidad del servicio.
            </p>
          </Clause>

          <Clause numeral="XIV" title="De los Derechos ARCO y Aviso de Privacidad">
            <p>
              <DropCap>C</DropCap>onforme a la <em>Ley Federal de Protección de Datos
              Personales en Posesión de los Particulares</em> (LFPDPPP), el Cliente
              tiene en todo momento los siguientes <strong>derechos ARCO</strong>:
              <em> (A) Acceso</em> — conocer qué datos personales tenemos sobre él;
              <em> (R) Rectificación</em> — solicitar corrección de datos inexactos;
              <em> (C) Cancelación</em> — solicitar la supresión de sus datos;
              <em> (O) Oposición</em> — oponerse al tratamiento de sus datos para
              fines específicos. Para ejercer estos derechos, deberá enviar
              solicitud por escrito al correo <strong>cyberpiezas207@gmail.com</strong>,
              incluyendo identificación oficial y descripción clara del derecho que
              ejerce. El Proveedor responderá en un plazo máximo de
              <strong> veinte (20) días hábiles</strong>. La presente cláusula constituye
              también el aviso de privacidad simplificado conforme a la LFPDPPP.
            </p>
          </Clause>

          <Clause numeral="XV" title="Del Uso por Menores de Edad">
            <p>
              <DropCap>L</DropCap>os servicios de CyberPiezas están dirigidos a personas
              mayores de dieciocho (18) años, con capacidad jurídica para contratar
              conforme a la legislación mexicana. <strong>Está estrictamente prohibida
              la suscripción y uso por parte de menores de edad sin autorización
              expresa y por escrito de quien ejerza la patria potestad o tutela</strong>.
              En el caso particular de la plataforma <em>Tarima</em>, los artistas
              menores de edad únicamente podrán publicar contenido bajo supervisión
              y autorización escrita de su padre, madre o tutor legal, quien asumirá
              la responsabilidad por las publicaciones. El Proveedor se reserva el
              derecho de suspender cualquier cuenta cuando se acredite o presuma
              fundadamente la participación de menores sin autorización. Queda
              absolutamente prohibido y será objeto de denuncia inmediata ante la
              autoridad competente cualquier contenido que sexualice, exponga o
              ponga en riesgo a menores de edad.
            </p>
          </Clause>

          <Clause numeral="XVI" title="De los Términos Específicos por Producto">
            <p className="mb-3">
              <DropCap>L</DropCap>os siguientes lineamientos aplican según el producto
              contratado y prevalecen sobre las disposiciones generales en caso de
              contradicción:
            </p>
            <p className="mb-3 pl-4 border-l-2 border-amber-900/30">
              <strong>(a) Para Sistemas de Punto de Venta</strong> (Boutique, Abarrotes,
              Veterinaria, Verdulería): los datos de los clientes finales del
              Suscriptor son <em>propiedad exclusiva</em> de éste último; el Proveedor
              actúa como mero <em>procesador técnico</em>. El Cliente es responsable de
              cumplir con sus obligaciones fiscales (facturación, impuestos, retenciones)
              y de la veracidad de la información que ingresa al sistema. El Proveedor
              no se hace responsable por errores en cobros, cambio incorrecto,
              o cualquier discrepancia en transacciones operadas por el Cliente o sus
              empleados.
            </p>
            <p className="mb-3 pl-4 border-l-2 border-amber-900/30">
              <strong>(b) Para la Plataforma Tarima</strong>: el artista es propietario
              del contenido (fotografías, videos, audios, textos) que publica y
              <em> garantiza tener todos los derechos</em> de autor y de imagen sobre el
              mismo. Al publicar, otorga al Proveedor licencia limitada para
              almacenar, transmitir y mostrar el contenido en la plataforma. El
              Proveedor se reserva el derecho de <strong>remover sin previo aviso
              cualquier contenido</strong> que: contenga material sexual explícito,
              violencia, apología del delito, sustancias prohibidas, infrinja derechos
              de terceros, o contravenga los presentes términos. Las reservaciones,
              mensajes y comunicaciones entre artistas y contratantes son
              responsabilidad de las partes; el Proveedor facilita la herramienta
              pero <strong>no garantiza el cumplimiento de pagos ni la celebración
              efectiva de eventos</strong> acordados a través de la plataforma.
            </p>
          </Clause>

          <Clause numeral="XVII" title="Del Cumplimiento Internacional">
            <p>
              <DropCap>E</DropCap>n el supuesto de que el Cliente preste servicios a
              titulares de datos personales residentes en la Unión Europea, Reino Unido
              u otras jurisdicciones con regulaciones específicas (GDPR, UK-DPA, CCPA),
              el Cliente actuará como <em>Controlador</em> de dichos datos y el
              Proveedor como <em>Procesador</em>, asumiendo este último únicamente las
              obligaciones técnicas de seguridad razonable y confidencialidad. El
              Cliente deberá notificar al Proveedor por escrito de tal circunstancia,
              y celebrar, en su caso, un <strong>Acuerdo de Procesamiento de Datos
              (DPA)</strong> accesorio al presente. El Proveedor no asume
              responsabilidad por incumplimientos del Cliente respecto a las
              normativas internacionales aplicables a sus propios usuarios finales.
            </p>
          </Clause>

          {/* CIERRE */}
          <div className="text-center my-10 text-amber-900/40 text-2xl select-none">
            ✦  ❦  ✦  ❦  ✦
          </div>

          {/* SELLO Y FIRMA */}
          <div className="border-t-2 border-amber-900/20 pt-8 mt-12">
            <div className="text-center text-amber-950">
              <p
                className="italic mb-4 text-amber-900/80"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                "Construyo la herramienta que mi madre hubiera querido tener desde el principio."
              </p>
              <div className="my-6 flex items-center justify-center">
                <div
                  className="border-4 border-amber-900/40 rounded-full w-32 h-32 flex items-center justify-center text-center transform -rotate-6"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  <div>
                    <div className="text-xs font-bold text-amber-900/80 uppercase tracking-widest">
                      CyberPiezas
                    </div>
                    <div className="text-[10px] text-amber-900/60 italic mt-1">
                      Hecho en México
                    </div>
                    <div className="text-[10px] text-amber-900/60 mt-1">
                      2026
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm font-bold text-amber-950" style={{ fontFamily: "'Playfair Display', serif" }}>
                David Antonio Farfán Gómez
              </p>
              <p className="text-xs text-amber-900/70 italic">
                Titular y Representante Legal
              </p>
              <p className="text-xs text-amber-900/60 mt-2">
                Morelos, México · Contacto: cyberpiezas207@gmail.com
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER DE ACEPTACIÓN */}
        {!alreadyAccepted && (
          <div className="sticky bottom-4 mt-8 z-20">
            <div
              className="bg-amber-50 border-2 border-amber-900/40 rounded-2xl shadow-2xl p-5 md:p-6"
              style={{
                boxShadow: "0 20px 50px -10px rgba(101, 67, 33, 0.5)",
              }}
            >
              {!hasReadAll ? (
                <div className="text-center text-amber-900/80 italic">
                  <ScrollText className="w-6 h-6 mx-auto mb-2 opacity-60" />
                  Desplázate hasta el final del documento para habilitar la aceptación...
                </div>
              ) : (
                <>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="flex-shrink-0 mt-1">
                      <div
                        onClick={(e) => {
                          e.preventDefault();
                          setCheckboxAccepted(!checkboxAccepted);
                        }}
                        className={
                          "w-6 h-6 rounded border-2 flex items-center justify-center transition-all " +
                          (checkboxAccepted
                            ? "bg-amber-800 border-amber-900"
                            : "bg-amber-50 border-amber-900/50 group-hover:border-amber-900")
                        }
                      >
                        {checkboxAccepted && <Check className="w-4 h-4 text-amber-50" strokeWidth={3} />}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={checkboxAccepted}
                      onChange={(e) => setCheckboxAccepted(e.target.checked)}
                      className="sr-only"
                    />
                    <span
                      className="text-sm md:text-base text-amber-950 leading-relaxed"
                      style={{ fontFamily: "'Crimson Pro', serif" }}
                    >
                      He leído íntegramente los Términos y Condiciones, declaro
                      comprender su contenido y manifiesto mi voluntad de obligarme
                      conforme a sus cláusulas. Esta aceptación es voluntaria,
                      informada y vinculante.
                    </span>
                  </label>
                  <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-end">
                    <button
                      onClick={() => window.history.back()}
                      className="px-5 py-2.5 rounded-full border-2 border-amber-900/30 text-amber-900 hover:bg-amber-100 transition-colors text-sm font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAccept}
                      disabled={!checkboxAccepted || acceptTermsMutation.isPending}
                      className={
                        "px-6 py-2.5 rounded-full font-bold text-sm transition-all flex items-center gap-2 " +
                        (checkboxAccepted && !acceptTermsMutation.isPending
                          ? "bg-amber-900 text-amber-50 hover:bg-amber-950 shadow-lg"
                          : "bg-amber-200 text-amber-700 cursor-not-allowed")
                      }
                    >
                      {acceptTermsMutation.isPending ? (
                        <>Guardando...</>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Aceptar y firmar
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Si ya aceptó */}
        {alreadyAccepted && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-700 text-white rounded-full shadow-lg">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-bold">Has aceptado estos términos</span>
            </div>
            <p className="mt-3 text-sm text-amber-800/70 italic">
              {acceptedAt
                ? `Fecha de aceptación: ${new Date(acceptedAt).toLocaleDateString("es-MX", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}`
                : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENTES AUXILIARES (estilo pergamino)
// =============================================================================

function Clause({
  numeral,
  title,
  children,
}: {
  numeral: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <span
          className="text-2xl md:text-3xl font-bold text-amber-900 select-none"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {numeral}.
        </span>
        <h2
          className="text-xl md:text-2xl font-bold text-amber-950 uppercase tracking-wide"
          style={{
            fontFamily: "'Playfair Display', serif",
            letterSpacing: "0.05em",
          }}
        >
          {title}
        </h2>
      </div>
      <div className="h-px bg-gradient-to-r from-amber-900/30 via-amber-900/10 to-transparent mb-4" />
      <div
        className="text-amber-950 leading-relaxed text-base md:text-lg text-justify"
        style={{ fontFamily: "'Crimson Pro', serif" }}
      >
        {children}
      </div>
    </section>
  );
}

function DropCap({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="float-left text-5xl md:text-6xl font-bold text-amber-900 mr-2 leading-none mt-1"
      style={{
        fontFamily: "'Playfair Display', serif",
        textShadow: "1px 1px 0 rgba(180, 140, 80, 0.2)",
      }}
    >
      {children}
    </span>
  );
}
