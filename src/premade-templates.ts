import {ROOT_FOLDER,type LibraryState,type TemplateItem} from './library';

// Versioned once-per-library so a deleted or edited starter card stays deleted or edited.
const SEED_VERSION=1;
const premade:Pick<TemplateItem,'id'|'name'|'text'|'transparentBackground'>[]=[
  {
    id:'premade:transparent-cutout',name:'Transparent cutout',transparentBackground:true,
    text:'Produce one isolated {Subject} as a reusable PNG asset. View: {View:front three-quarter|front|side|top-down}. Style: {Style:photorealistic|clean illustration|3D render}. Keep the entire subject in frame with clean, natural edges and fine detail. Outside the subject, use genuine transparent alpha pixels. No floor, backdrop, cast shadow, border, lettering, or checkerboard pattern.'
  },
  {
    id:'premade:product-hero',name:'Product hero photo',
    text:'Commercial studio photograph of {Product}. Surface: {Surface:matte stone|seamless paper|brushed metal|wood}. Lighting: {Lighting:softbox|window light|dramatic rim light}. Camera angle: {Angle:three-quarter|eye level|top-down}. Show accurate materials and a readable silhouette, with a believable contact shadow. Leave a clean margin for later layout work. No invented logos or text.'
  },
  {
    id:'premade:product-lifestyle',name:'Lifestyle product scene',
    text:'Create a believable lifestyle scene featuring {Product} in {Setting}. Art direction: {Mood:warm and inviting|clean and modern|bold and energetic}. Time of day: {Light:morning|midday|golden hour|evening}. Make the product the clear focal point and match its scale, perspective, reflections, and shadows to the environment. Keep branding and package lettering unchanged when a reference image is supplied.'
  },
  {
    id:'premade:background-replace',name:'Replace background',
    text:'For the selected background area, create {New setting} around the existing subject. Mood: {Mood:bright studio|natural daylight|cinematic|soft neutral}. Preserve the subject, silhouette, pose, and camera angle. Match horizon, depth, lighting direction, color temperature, and contact shadows so the replacement belongs in the original photograph. Do not add people, lettering, or unrelated props.'
  },
  {
    id:'premade:composite-object',name:'Add object to scene',
    text:'Place {Object} in the selected area of the existing scene. Material: {Material:natural|polished metal|glass|fabric|painted}. Placement: {Placement:foreground|midground|background}. Match the source image perspective, scale, depth of field, light direction, shadows, and reflections. Preserve all unselected content and avoid duplicate objects.'
  },
  {
    id:'premade:portrait-refine',name:'Portrait refinement',
    text:'Refine the selected part of this portrait: {Adjustment}. Finish: {Finish:natural editorial|polished commercial|cinematic}. Preserve the person\'s identity, expression, skin texture, anatomy, hairline, and original lighting direction. Keep the result plausible and consistent with surrounding pixels; do not change unselected areas.'
  },
  {
    id:'premade:poster-art',name:'Poster key art',
    text:'Create key art for {Project or story}. Central subject: {Subject}. Genre: {Genre:drama|science fiction|fantasy|thriller|documentary}. Palette: {Palette:muted|high contrast|warm|cool}. Build a strong focal hierarchy and cinematic depth. Reserve clear negative space for a title and credits to be typeset later in Photon. Do not render any words, logos, or fake credits in the image.'
  },
  {
    id:'premade:social-campaign',name:'Social campaign visual',
    text:'Design the image layer for a {Campaign subject} social post aimed at {Audience}. Format: {Format:square feed|vertical story|wide thumbnail}. Look: {Look:photographic|graphic collage|editorial illustration}. Make one unmistakable focal subject and leave uncluttered negative space for a headline and call to action. Use a coherent palette and strong readability at small size. No baked-in text.'
  },
  {
    id:'premade:web-hero',name:'Website hero image',
    text:'Create a website hero visual for {Brand or topic}, featuring {Subject}. Composition: {Copy placement:left|right|center}. Style: {Style:premium photography|minimal 3D|editorial illustration}. Keep the subject away from the copy area and leave broad, low-detail negative space there. Make the scene crop-friendly for desktop and mobile layouts. No text, buttons, logos, or interface elements.'
  },
  {
    id:'premade:surface-pattern',name:'Seamless surface pattern',
    text:'Generate a repeatable surface design made of {Motif}. Treatment: {Treatment:hand-drawn|photographic texture|geometric|watercolor}. Density: {Density:sparse|balanced|dense}. Palette: {Colors}. Keep scale and detail consistent. Edges must align for a seamless tile in both directions, without a central vignette, frame, lighting gradient, lettering, or a visible seam.'
  }
];

export function seedPremadeTemplates(library:LibraryState):boolean{
  if(library.templateSeedVersion>=SEED_VERSION)return false;
  const now=Date.now();
  for(const [index,item] of premade.entries()){
    if(library.templates.some(template=>template.id===item.id))continue;
    library.templates.push({...item,folderId:ROOT_FOLDER,references:[],order:index,createdAt:now,updatedAt:now});
  }
  library.templateSeedVersion=SEED_VERSION;
  return true;
}
