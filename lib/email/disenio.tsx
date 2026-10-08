import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

// Diseño común de todos los correos: sobrio, legible en móvil y sin imágenes
// remotas (que muchos clientes de correo bloquean).

type Props = {
  idioma: string;
  asunto: string;
  parrafos: string[];
  boton?: { texto: string; url: string };
  pie: string;
};

const colores = {
  fondo: "#f7efe1",
  tinta: "#2b1f17",
  azafran: "#9a5f0f",
  pimenton: "#b23f1d",
};

export function CorreoYerga({ idioma, asunto, parrafos, boton, pie }: Props) {
  return (
    <Html lang={idioma === "va" ? "ca" : idioma}>
      <Head />
      <Preview>{asunto}</Preview>
      <Body style={{ backgroundColor: colores.fondo, fontFamily: "Georgia, serif", margin: 0, padding: "24px 0" }}>
        <Container style={{ backgroundColor: "#ffffff", maxWidth: 520, padding: "32px 28px", borderRadius: 12 }}>
          <Text style={{ color: colores.pimenton, fontSize: 13, letterSpacing: 3, textTransform: "uppercase", margin: 0 }}>
            Arrocería Yerga
          </Text>
          <Heading as="h1" style={{ color: colores.tinta, fontSize: 24, lineHeight: "30px", margin: "12px 0 20px" }}>
            {asunto}
          </Heading>
          {parrafos.map((p, i) => (
            <Text key={i} style={{ color: colores.tinta, fontSize: 16, lineHeight: "24px", fontFamily: "Helvetica, Arial, sans-serif" }}>
              {p}
            </Text>
          ))}
          {boton ? (
            <Section style={{ margin: "24px 0" }}>
              <Button
                href={boton.url}
                style={{
                  backgroundColor: colores.pimenton,
                  color: "#ffffff",
                  padding: "14px 22px",
                  borderRadius: 999,
                  fontFamily: "Helvetica, Arial, sans-serif",
                  fontWeight: 600,
                  fontSize: 16,
                }}
              >
                {boton.texto}
              </Button>
            </Section>
          ) : null}
          <Hr style={{ borderColor: "#efe3cd", margin: "28px 0 16px" }} />
          <Text style={{ color: "#6f6259", fontSize: 12, lineHeight: "18px", fontFamily: "Helvetica, Arial, sans-serif" }}>
            {pie}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
