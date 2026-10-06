import {ROOT_FOLDER,type LibraryState,type TemplateItem} from './library';

// Versioned once-per-library so a deleted or edited starter card stays deleted or edited.
const SEED_VERSION=2;
const premade:Pick<TemplateItem,'id'|'name'|'text'|'transparentBackground'>[]=[
  {
    id:'premade:transparent-cutout',name:'Transparent cutout',transparentBackground:true,
    text:'Produce one isolated {Subject} as a reusable PNG asset. View: {View|select:Three-quarter=>front three-quarter|Front=>front|Side=>side|Top-down=>top-down}. Style: {Style|radio:Photo=>photorealistic|Illustration=>clean illustration|3D=>3D render}. Keep the entire subject in frame with clean, natural edges and fine detail. Outside the subject, use genuine transparent alpha pixels. No floor, backdrop, cast shadow, border, lettering, or checkerboard pattern.'
  },
  {
    id:'premade:product-hero',name:'Product hero photo',
    text:'Commercial studio photograph of {Product}. Surface: {Surface|select:Stone=>matte stone|Paper=>seamless paper|Metal=>brushed metal|Wood=>wood}. Lighting: {Lighting|radio:Softbox=>softbox|Window=>window light|Rim=>dramatic rim light}. Camera angle: {Angle|select:Three-quarter=>three-quarter|Eye level=>eye level|Top-down=>top-down}. Show accurate materials and a readable silhouette, with a believable contact shadow. Leave a clean margin for later layout work. No invented logos or text.\n{Styling props|check:Add a few restrained styling props outside the product silhouette.}\n{Surface details|multi:Droplets=>Include subtle water droplets|Texture=>Show tactile surface texture|Reflections=>Add controlled reflections}'
  },
  {
    id:'premade:product-lifestyle',name:'Lifestyle product scene',
    text:'Create a believable lifestyle scene featuring {Product} in {Setting}. Art direction: {Mood|select:Warm=>warm and inviting|Modern=>clean and modern|Bold=>bold and energetic}. Time of day: {Light|radio:Morning=>morning|Midday=>midday|Golden hour=>golden hour|Evening=>evening}. Make the product the clear focal point and match its scale, perspective, reflections, and shadows to the environment. Keep branding and package lettering unchanged when a reference image is supplied.\n{Scene details|multi:People=>Include natural background activity|Plants=>Add restrained greenery|Textiles=>Add tactile textiles}'
  },
  {
    id:'premade:background-replace',name:'Replace background',
    text:'For the selected background area, create {New setting} around the existing subject. Mood: {Mood|radio:Studio=>bright studio|Daylight=>natural daylight|Cinematic=>cinematic|Neutral=>soft neutral}. Preserve the subject, silhouette, pose, and camera angle. Match horizon, depth, lighting direction, color temperature, and contact shadows so the replacement belongs in the original photograph. Do not add people, lettering, or unrelated props.\n{Depth haze|check:Add subtle atmospheric depth behind the subject.}'
  },
  {
    id:'premade:composite-object',name:'Add object to scene',
    text:'Place {Object} in the selected area of the existing scene. Material: {Material|select:Natural=>natural|Metal=>polished metal|Glass=>glass|Fabric=>fabric|Painted=>painted}. Placement: {Placement|radio:Foreground=>foreground|Midground=>midground|Background=>background}. Match the source image perspective, scale, depth of field, light direction, shadows, and reflections. Preserve all unselected content and avoid duplicate objects.\n{Nearby reflections|check:Add matching reflections on nearby glossy surfaces.}'
  },
  {
    id:'premade:portrait-refine',name:'Portrait refinement',
    text:'Refine the selected part of this portrait: {Adjustment}. Finish: {Finish|radio:Editorial=>natural editorial|Commercial=>polished commercial|Cinematic=>cinematic}. Preserve the person\'s identity, expression, skin texture, anatomy, hairline, and original lighting direction. Keep the result plausible and consistent with surrounding pixels; do not change unselected areas.'
  },
  {
    id:'premade:poster-art',name:'Poster key art',
    text:'Create key art for {Project or story}. Central subject: {Subject}. Genre: {Genre|select:Drama=>drama|Sci-fi=>science fiction|Fantasy=>fantasy|Thriller=>thriller|Documentary=>documentary}. Palette: {Palette|select:Muted=>muted|Contrast=>high contrast|Warm=>warm|Cool=>cool}. Build a strong focal hierarchy and cinematic depth. Reserve clear negative space for a title and credits to be typeset later in Photon. Do not render any words, logos, or fake credits in the image.\n{Film grain|check:Add fine analog film grain.|Keep a clean, grain-free finish.}\n{Visual cues|multi:Silhouette=>Use a striking silhouette|Weather=>Add atmospheric weather|Architecture=>Include evocative architecture}'
  },
  {
    id:'premade:social-campaign',name:'Social campaign visual',
    text:'Design the image layer for a {Campaign subject} social post aimed at {Audience}. Format: {Format|radio:Square=>square feed|Story=>vertical story|Wide=>wide thumbnail}. Look: {Look|select:Photo=>photographic|Collage=>graphic collage|Illustration=>editorial illustration}. Make one unmistakable focal subject and leave uncluttered negative space for a headline and call to action. Use a coherent palette and strong readability at small size. No baked-in text.\n{Accents|multi:Shapes=>Add restrained geometric shapes|Texture=>Introduce subtle texture|Motion=>Suggest a sense of motion}'
  },
  {
    id:'premade:web-hero',name:'Website hero image',
    text:'Create a website hero visual for {Brand or topic}, featuring {Subject}. Composition: {Copy placement|radio:Left=>left|Right=>right|Center=>center}. Style: {Style|select:Photo=>premium photography|3D=>minimal 3D|Illustration=>editorial illustration}. Keep the subject away from the copy area and leave broad, low-detail negative space there. Make the scene crop-friendly for desktop and mobile layouts. No text, buttons, logos, or interface elements.'
  },
  {
    id:'premade:surface-pattern',name:'Seamless surface pattern',
    text:'Generate a repeatable surface design made of {Motif}. Treatment: {Treatment|select:Drawn=>hand-drawn|Photo=>photographic texture|Geometric=>geometric|Watercolor=>watercolor}. Density: {Density|radio:Sparse=>sparse|Balanced=>balanced|Dense=>dense}. Palette: {Colors}. Keep scale and detail consistent. Edges must align for a seamless tile in both directions, without a central vignette, frame, lighting gradient, lettering, or a visible seam.'
  }
];

export function seedPremadeTemplates(library:LibraryState):boolean{
  if(library.templateSeedVersion>=SEED_VERSION)return false;
  const now=Date.now();
  for(const [index,item] of premade.entries()){
    const existing=library.templates.find(template=>template.id===item.id);
    if(existing){
      if(library.templateSeedVersion===1&&existing.createdAt===existing.updatedAt&&existing.name===item.name)existing.text=item.text;
      continue;
    }
    if(library.templateSeedVersion<1)library.templates.push({...item,folderId:ROOT_FOLDER,references:[],order:index,createdAt:now,updatedAt:now});
  }
  library.templateSeedVersion=SEED_VERSION;
  return true;
}
