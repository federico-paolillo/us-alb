import type { ContactMethodDto, LocationDto } from "@cmsjs/cms/model";
import { ContactSection } from "@cmsjs/components/home/contact-section";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

describe("ContactSection", () => {
  it("keeps the contact target and update message when contact content is absent", () => {
    const html = renderToStaticMarkup(
      createElement(ContactSection, {
        heading: "  ",
        introduction: "\n ",
        contactMethods: [],
        locations: [],
      }),
    );

    expect(html.match(/id="contatti"/g)).toHaveLength(1);
    expect(html).toContain('aria-labelledby="contatti-heading"');
    expect(html).toContain('id="contatti-heading">Contatti</h2>');
    expect(html).toContain("I contatti sono in aggiornamento.");
  });

  it("renders club contacts before semantic location details with DTO-provided links", () => {
    const clubEmail: ContactMethodDto = {
      kind: "email",
      label: "Segreteria",
      value:
        "segreteria-sportiva-con-un-indirizzo-molto-lungo@usalbatese.example",
      href: "mailto:segreteria-sportiva@usalbatese.example",
    };
    const locationPhone: ContactMethodDto = {
      kind: "phone",
      label: "Telefono sede",
      value: "+39 031 000 0000",
      href: "tel:+390310000000",
    };
    const location: LocationDto = {
      documentId: "location-home",
      name: "Sede sportiva",
      address: "Via della Comunità 68\nAlbate (CO)",
      contactMethods: [locationPhone],
      displayOrder: 1,
      showOnHome: true,
      showOnAbout: false,
      showOnActivity: false,
    };

    const html = renderToStaticMarkup(
      createElement(ContactSection, {
        heading: "Parla con noi",
        introduction: "Siamo a disposizione.",
        contactMethods: [clubEmail],
        locations: [location],
      }),
    );

    expect(html.indexOf(clubEmail.value)).toBeLessThan(
      html.indexOf(location.name),
    );
    expect(html).toContain("<address");
    expect(html).toContain(`href="${clubEmail.href}"`);
    expect(html).toContain(clubEmail.value);
    expect(html).toContain(`href="${locationPhone.href}"`);
    expect(html).toContain(locationPhone.value);
  });
});
