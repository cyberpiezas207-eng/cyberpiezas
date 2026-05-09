 const petsQuery = trpc.veterinaria.pets.list.useQuery({ search });
  const customersQuery = trpc.customers.list.useQuery();

  const pets = petsQuery.data ?? [];
  const customers: any[] = (customersQuery.data as any[]) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/70" />
          <Input
            placeholder="Buscar por nombre de mascota..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-slate-800/80 border-slate-700/80 text-white h-11"
          />
        </div>
        <Button
          onClick={() => {
            if (customers.length === 0) {
              toast.error("Primero registra al menos un cliente (dueño)");
              return;
            }
            setShowForm(true);
          }}
          className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white gap-2 font-bold shadow-lg shadow-emerald-500/20 h-11 px-5"
        >
          <Plus className="w-4 h-4" /> Nueva mascota
        </Button>
      </div>

      {customers.length === 0 && !showForm && (
        <Card className="bg-amber-950/40 border-amber-500/40">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-100 font-bold text-sm">Necesitas registrar clientes primero</p>
                <p className="text-amber-200/80 text-xs mt-0.5">
                  Cada mascota debe tener un dueño. Ve a la pestaña <strong>Clientes</strong> y agrega al menos uno.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <PetForm
          customers={customers}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            utils.veterinaria.pets.list.invalidate();
          }}
        />
      )}

      {petsQuery.isLoading ? (
        <div className="text-center py-16">
          <div className="inline-block w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-slate-300 mt-4 font-medium">Cargando mascotas...</p>
        </div>
      ) : pets.length === 0 ? (
        <Card className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-slate-700/80 border-dashed">
          <CardContent className="pt-14 pb-14 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <PawPrint className="w-10 h-10 text-emerald-400" />
            </div>
            <p className="text-white font-bold text-lg mb-1">
              {search ? "No se encontraron mascotas" : "Aun no hay mascotas registradas"}
            </p>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              {search
                ? "Prueba con otro nombre."
                : "Registra la primera mascota para empezar a llevar su expediente clinico."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pets.map((row: any) => {
            const pet = row.pet;
            const customer = row.customer;
            return (
              <Card
                key={pet.id}
                onClick={() => onSelectPet(pet.id)}
                className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 border-slate-700/80 hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-500/10 cursor-pointer transition-all group"
              >
                <CardContent className="pt-6 pb-5">
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-4xl group-hover:scale-105 transition-transform">
                      {speciesEmoji[pet.species] || "🐾"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-base truncate">{pet.name}</h3>
                      <p className="text-sm text-emerald-300/70 truncate font-medium capitalize">
                        {pet.breed || pet.species}
                      </p>
                      {customer && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs">
                          <UserCircle className="w-3 h-3 text-purple-300 flex-shrink-0" />
                          <span className="text-purple-200 truncate font-medium">{customer.name}</span>
                        </div>
                      )}
                      <div className="flex gap-1.5 mt-2.5 flex-wrap">
                        <Badge className="bg-slate-700/80 text-slate-100 text-xs capitalize border border-slate-600">
                          {pet.sex}
                        </Badge>
                        {pet.sterilized && (
                          <Badge className="bg-emerald-500/20 text-emerald-200 text-xs border border-emerald-500/40">
                            Esterilizado
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PetForm({ customers, onClose, onSaved }: { customers: any[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    customerId: 0,
    name: "",
    species: "perro" as const,
    breed: "",
    sex: "desconocido" as const,
    sterilized: false,
    color: "",
    microchip: "",
    weight: "",
    notes: "",
  });

  const createPet = trpc.veterinaria.pets.create.useMutation({
    onSuccess: () => {
      toast.success("Mascota registrada");
      onSaved();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!form.customerId) return toast.error("Selecciona un cliente");
    if (!form.name) return toast.error("Nombre requerido");
    createPet.mutate({
      customerId: form.customerId,
      name: form.name,
      species: form.species,
      breed: form.breed || undefined,
      sex: form.sex,
      sterilized: form.sterilized,
      color: form.color || undefined,
      microchip: form.microchip || undefined,
      weight: form.weight || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <Card className="bg-gradient-to-br from-emerald-950/60 via-slate-900 to-cyan-950/60 border-emerald-500/40 shadow-2xl shadow-emerald-500/10">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <PawPrint className="w-5 h-5 text-emerald-300" />
          </div>
          Nueva mascota
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-300 hover:text-white hover:bg-slate-800">
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Selector de cliente destacado */}
        <div className="bg-purple-950/30 border border-purple-500/30 rounded-xl p-4">
          <label className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <UserCircle className="w-3.5 h-3.5" />
            Dueño de la mascota <span className="text-rose-400">*</span>
          </label>
          {customers.length === 0 ? (
            <div className="flex items-center gap-2 text-amber-200 text-sm bg-amber-950/30 border border-amber-500/30 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Primero registra un cliente en la pestaña <strong>Clientes</strong>.</span>
            </div>
          ) : (
            <select
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white h-11 font-medium focus:border-purple-500/60 focus:outline-none"
            >
              <option value={0}>-- Selecciona el cliente --</option>
              {customers.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.phone ? " (" + c.phone + ")" : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Datos basicos */}
        <div>
          <p className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <PawPrint className="w-3 h-3" /> Datos de la mascota
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-200 mb-1.5 block">Nombre <span className="text-rose-400">*</span></label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Firulais"
                className="bg-slate-900 border-slate-700 text-white h-11"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-200 mb-1.5 block">Especie</label>
              <select
                value={form.species}
                onChange={(e) => setForm({ ...form, species: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white h-11 font-medium focus:border-emerald-500/60 focus:outline-none"
              >
                <option value="perro">🐕 Perro</option>
                <option value="gato">🐈 Gato</option>
                <option value="ave">🦜 Ave</option>
                <option value="reptil">🦎 Reptil</option>
                <option value="roedor">🐹 Roedor</option>
                <option value="exotico">🦊 Exotico</option>
                <option value="otro">🐾 Otro</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-200 mb-1.5 block">Raza</label>
              <Input
                value={form.breed}
                onChange={(e) => setForm({ ...form, breed: e.target.value })}
                placeholder="Labrador, Persa, Mestizo..."
                className="bg-slate-900 border-slate-700 text-white h-11"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-200 mb-1.5 block">Sexo</label>
              <select
                value={form.sex}
                onChange={(e) => setForm({ ...form, sex: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white h-11 font-medium focus:border-emerald-500/60 focus:outline-none"
              >
                <option value="desconocido">Desconocido</option>
                <option value="macho">Macho</option>
                <option value="hembra">Hembra</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-200 mb-1.5 block">Color</label>
              <Input
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                placeholder="Cafe con blanco"
                className="bg-slate-900 border-slate-700 text-white h-11"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-200 mb-1.5 block">Peso (kg)</label>
              <Input
                type="number"
                step="0.01"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                placeholder="12.5"
                className="bg-slate-900 border-slate-700 text-white h-11"
              />
            </div>
          </div>
        </div>

        {/* Datos opcionales */}
        <div className="space-y-3 pt-2 border-t border-slate-700/50">
          <div>
            <label className="text-xs font-bold text-slate-200 mb-1.5 block">Numero de microchip</label>
            <Input
              value={form.microchip}
              onChange={(e) => setForm({ ...form, microchip: e.target.value })}
              placeholder="123456789012345"
              className="bg-slate-900 border-slate-700 text-white h-11"
            />
          </div>
          <label className="flex items-center gap-2.5 text-sm text-slate-100 bg-slate-900/60 rounded-lg p-3 border border-slate-700/50 cursor-pointer hover:bg-slate-800/60 transition-colors">
            <input
              type="checkbox"
              checked={form.sterilized}
              onChange={(e) => setForm({ ...form, sterilized: e.target.checked })}
              className="w-4 h-4 accent-emerald-500"
            />
            <span className="font-medium">Mascota esterilizada</span>
          </label>
          <div>
            <label className="text-xs font-bold text-slate-200 mb-1.5 block">Notas medicas / observaciones</label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Alergias, comportamiento, condiciones especiales..."
              className="bg-slate-900 border-slate-700 text-white min-h-[80px]"
              rows={3}
            />
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSubmit}
            disabled={createPet.isPending || customers.length === 0}
            className="flex-1 h-11 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white gap-2 font-bold shadow-lg shadow-emerald-500/20"
          >
            <Save className="w-4 h-4" />
            {createPet.isPending ? "Guardando mascota..." : "Guardar mascota"}
          </Button>
          <Button variant="outline" onClick={onClose} className="border-slate-600 text-slate-200 hover:bg-slate-700">
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// PET DETAIL VIEW - Expediente clinico
// ============================================================================

function PetDetailView({ petId, onBack }: { petId: number; onBack: () => void }) {
  const petQuery = trpc.veterinaria.pets.getById.useQuery({ id: petId });
  const visitsQuery = trpc.veterinaria.visits.listByPet.useQuery({ petId });
  const vaccinationsQuery = trpc.veterinaria.vaccinations.listByPet.useQuery({ petId });

  const [showVisitForm, setShowVisitForm] = useState(false);
  const [showVaccineForm, setShowVaccineForm] = useState(false);

  const utils = trpc.useUtils();

  if (petQuery.isLoading) {
    return <p className="text-center text-slate-400 py-12">Cargando expediente...</p>;
  }

  if (!petQuery.data) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Mascota no encontrada</p>
        <Button onClick={onBack} variant="link" className="mt-2">Volver</Button>
      </div>
    );
  }

  const pet = petQuery.data.pet;
  const customer = petQuery.data.customer;
  const visits = visitsQuery.data ?? [];
  const vaccinations = vaccinationsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <Button
        onClick={onBack}
        variant="ghost"
        className="text-slate-400 gap-2"
      >
        <ArrowLeft className="w-4 h-4" /> Volver a mascotas
      </Button>

      {/* Datos basicos */}
      <Card className="bg-gradient-to-br from-emerald-600/10 to-cyan-600/10 border-emerald-500/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="text-6xl">{speciesEmoji[pet.species] || "🐾"}</div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">{pet.name}</h2>
              <p className="text-slate-400">
                {pet.breed || pet.species} • {pet.sex}
                {pet.weight && ` • ${pet.weight} kg`}
              </p>
              {customer && (
                <div className="mt-3 flex items-center gap-3 text-sm text-slate-300">
                  <span className="flex items-center gap-1">
                    👤 {customer.name}
                  </span>
                  {customer.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {customer.phone}
                    </span>
                  )}
                </div>
              )}
              {pet.allergies && (
                <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded-md">
                  <p className="text-xs text-red-300 font-bold uppercase flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Alergias
                  </p>
                  <p className="text-sm text-red-200">{pet.allergies}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visitas */}
      <Card className="bg-slate-800/60 border-slate-700/80">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" />
            Historial de visitas ({visits.length})
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setShowVisitForm(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white gap-1"
          >
            <Plus className="w-3 h-3" /> Nueva
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {showVisitForm && (
            <VisitForm
              petId={petId}
              customerId={pet.customerId}
              onClose={() => setShowVisitForm(false)}
              onSaved={() => {
                setShowVisitForm(false);
                utils.veterinaria.visits.listByPet.invalidate({ petId });
              }}
            />
          )}
          {visits.length === 0 ? (
            <p className="text-center text-slate-400 py-6 text-sm">
              Sin visitas registradas
            </p>
          ) : (
            visits.map((v: any) => (
              <div key={v.id} className="p-3 bg-slate-800/60 rounded-lg border border-white/5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-white">{v.reason}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(v.visitDate), "dd 'de' MMM, yyyy 'a las' HH:mm", { locale: es })}
                    </p>
                  </div>
                </div>
                {v.diagnosis && (
                  <p className="text-sm text-slate-300 mt-2">
                    <span className="text-purple-400 font-semibold">Diagnostico:</span> {v.diagnosis}
                  </p>
                )}
                {v.treatment && (
                  <p className="text-sm text-slate-300 mt-1">
                    <span className="text-emerald-400 font-semibold">Tratamiento:</span> {v.treatment}
                  </p>
                )}
                {v.prescribedMedications && (
                  <p className="text-sm text-slate-300 mt-1">
                    <span className="text-amber-400 font-semibold">Medicamentos:</span> {v.prescribedMedications}
                  </p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Vacunas */}
      <Card className="bg-slate-800/60 border-slate-700/80">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Syringe className="w-5 h-5 text-cyan-400" />
            Vacunas ({vaccinations.length})
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setShowVaccineForm(true)}
            className="bg-cyan-600 hover:bg-cyan-700 text-white gap-1"
          >
            <Plus className="w-3 h-3" /> Nueva
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {showVaccineForm && (
            <VaccineForm
              petId={petId}
              onClose={() => setShowVaccineForm(false)}
              onSaved={() => {
                setShowVaccineForm(false);
                utils.veterinaria.vaccinations.listByPet.invalidate({ petId });
              }}
            />
          )}
          {vaccinations.length === 0 ? (
            <p className="text-center text-slate-400 py-6 text-sm">
              Sin vacunas registradas
            </p>
          ) : (
            vaccinations.map((vac: any) => (
              <div key={vac.id} className="p-3 bg-slate-800/60 rounded-lg border border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{vac.vaccineName}</p>
                    <p className="text-xs text-slate-400">
                      Aplicada: {format(new Date(vac.appliedDate), "dd MMM yyyy", { locale: es })}
                      {vac.brand && ` • ${vac.brand}`}
                    </p>
                  </div>
                  {vac.nextDoseDate && (
                    <Badge className="bg-amber-500/20 text-amber-300">
                      Proxima: {format(new Date(vac.nextDoseDate), "dd MMM", { locale: es })}
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function VisitForm({ petId, customerId, onClose, onSaved }: {
  petId: number;
  customerId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    reason: "",
    weight: "",
    temperature: "",
    diagnosis: "",
    treatment: "",
    prescribedMedications: "",
  });

  const createVisit = trpc.veterinaria.visits.create.useMutation({
    onSuccess: () => {
      toast.success("Visita registrada");
      onSaved();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!form.reason) return toast.error("Motivo requerido");
    createVisit.mutate({
      petId,
      customerId,
      reason: form.reason,
      weight: form.weight || undefined,
      temperature: form.temperature || undefined,
      diagnosis: form.diagnosis || undefined,
      treatment: form.treatment || undefined,
      prescribedMedications: form.prescribedMedications || undefined,
    });
  };

  return (
    <div className="p-4 bg-purple-950/30 border border-purple-500/30 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-purple-200">Nueva visita</p>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      <Input
        placeholder="Motivo de la visita *"
        value={form.reason}
        onChange={(e) => setForm({ ...form, reason: e.target.value })}
        className="bg-slate-900/80 border-slate-700/80 text-white"
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Peso (kg)"
          type="number"
          step="0.01"
          value={form.weight}
          onChange={(e) => setForm({ ...form, weight: e.target.value })}
          className="bg-slate-900/80 border-slate-700/80 text-white"
        />
        <Input
          placeholder="Temperatura"
          type="number"
          step="0.1"
          value={form.temperature}
          onChange={(e) => setForm({ ...form, temperature: e.target.value })}
          className="bg-slate-900/80 border-slate-700/80 text-white"
        />
      </div>
      <Textarea
        placeholder="Diagnostico"
        value={form.diagnosis}
        onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
        rows={2}
        className="bg-slate-900/80 border-slate-700/80 text-white"
      />
      <Textarea
        placeholder="Tratamiento"
        value={form.treatment}
        onChange={(e) => setForm({ ...form, treatment: e.target.value })}
        rows={2}
        className="bg-slate-900/80 border-slate-700/80 text-white"
      />
      <Textarea
        placeholder="Medicamentos recetados"
        value={form.prescribedMedications}
        onChange={(e) => setForm({ ...form, prescribedMedications: e.target.value })}
        rows={2}
        className="bg-slate-900/80 border-slate-700/80 text-white"
      />
      <Button
        onClick={handleSubmit}
        disabled={createVisit.isPending}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
      >
        {createVisit.isPending ? "Guardando..." : "Guardar visita"}
      </Button>
    </div>
  );
}

function VaccineForm({ petId, onClose, onSaved }: {
  petId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    vaccineName: "",
    brand: "",
    batchNumber: "",
    nextDoseDate: "",
  });

  const createVaccine = trpc.veterinaria.vaccinations.create.useMutation({
    onSuccess: () => {
      toast.success("Vacuna registrada");
      onSaved();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!form.vaccineName) return toast.error("Nombre de vacuna requerido");
    createVaccine.mutate({
      petId,
      vaccineName: form.vaccineName,
      brand: form.brand || undefined,
      batchNumber: form.batchNumber || undefined,
      nextDoseDate: form.nextDoseDate ? new Date(form.nextDoseDate) : undefined,
    });
  };

  return (
    <div className="p-4 bg-cyan-950/30 border border-cyan-500/30 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-cyan-200">Nueva vacuna</p>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      <Input
        placeholder="Nombre de la vacuna *"
        value={form.vaccineName}
        onChange={(e) => setForm({ ...form, vaccineName: e.target.value })}
        className="bg-slate-900/80 border-slate-700/80 text-white"
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Marca"
          value={form.brand}
          onChange={(e) => setForm({ ...form, brand: e.target.value })}
          className="bg-slate-900/80 border-slate-700/80 text-white"
        />
        <Input
          placeholder="Lote"
          value={form.batchNumber}
          onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
          className="bg-slate-900/80 border-slate-700/80 text-white"
        />
      </div>
      <div>
        <label className="text-xs text-cyan-300">Proxima dosis (opcional)</label>
        <Input
          type="date"
          value={form.nextDoseDate}
          onChange={(e) => setForm({ ...form, nextDoseDate: e.target.value })}
          className="bg-slate-900/80 border-slate-700/80 text-white"
        />
      </div>
      <Button
        onClick={handleSubmit}
        disabled={createVaccine.isPending}
        className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
      >
        {createVaccine.isPending ? "Guardando..." : "Registrar vacuna"}
      </Button>
    </div>
  );
}

// ============================================================================
// PRODUCTS TAB
// ============================================================================

function ProductsTab() {
  const utils = trpc.useUtils();
  const productsQuery = trpc.veterinaria.products.list.useQuery({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "otro" as const,
    price: "",
    cost: "",
    stock: 0,
    requiresPrescription: false,
  });

  const createProduct = trpc.veterinaria.products.create.useMutation({
    onSuccess: () => {
      toast.success("Producto creado correctamente");
      setShowForm(false);
      setForm({ name: "", category: "otro", price: "", cost: "", stock: 0, requiresPrescription: false });
      utils.veterinaria.products.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteProduct = trpc.veterinaria.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Producto eliminado");
      utils.veterinaria.products.list.invalidate();
    },
  });

  const products = productsQuery.data ?? [];

  const categoryColors: Record<string, string> = {
    medicamento: "bg-rose-500/20 text-rose-200 border-rose-500/40",
    alimento: "bg-amber-500/20 text-amber-200 border-amber-500/40",
    accesorio: "bg-blue-500/20 text-blue-200 border-blue-500/40",
    higiene: "bg-cyan-500/20 text-cyan-200 border-cyan-500/40",
    vitamina: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
    otro: "bg-slate-500/20 text-slate-200 border-slate-500/40",
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white gap-2 font-bold shadow-lg shadow-purple-500/20 h-11 px-5"
        >
          <Plus className="w-4 h-4" /> Nuevo producto
        </Button>
      </div>

      {showForm && (
        <Card className="bg-gradient-to-br from-purple-950/60 via-slate-900 to-pink-950/60 border-purple-500/40 shadow-2xl shadow-purple-500/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-purple-300" />
              </div>
              Nuevo producto
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)} className="text-slate-300 hover:text-white">
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-1.5 block">
                Nombre del producto <span className="text-rose-400">*</span>
              </label>
              <Input
                placeholder="Ej. Antiparasitario Drontal"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-slate-900 border-slate-700 text-white h-11"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-1.5 block">Categoria</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white h-11 font-medium"
              >
                <option value="medicamento">💊 Medicamento</option>
                <option value="alimento">🍖 Alimento</option>
                <option value="accesorio">🦴 Accesorio</option>
                <option value="higiene">🧼 Higiene</option>
                <option value="vitamina">🌿 Vitamina</option>
                <option value="otro">📦 Otro</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-1.5 block">
                  Precio <span className="text-rose-400">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="0.00"
                  className="bg-slate-900 border-slate-700 text-white h-11"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-1.5 block">Costo</label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  placeholder="0.00"
                  className="bg-slate-900 border-slate-700 text-white h-11"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-1.5 block">Stock</label>
                <Input
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                  className="bg-slate-900 border-slate-700 text-white h-11"
                />
              </div>
            </div>
            <label className="flex items-center gap-2.5 text-sm text-slate-100 bg-slate-900/60 rounded-lg p-3 border border-slate-700/50 cursor-pointer hover:bg-slate-800/60">
              <input
                type="checkbox"
                checked={form.requiresPrescription}
                onChange={(e) => setForm({ ...form, requiresPrescription: e.target.checked })}
                className="w-4 h-4 accent-purple-500"
              />
              <span className="font-medium">Requiere receta medica</span>
            </label>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => {
                  if (!form.name || !form.price) return toast.error("Nombre y precio son obligatorios");
                  createProduct.mutate({
                    name: form.name,
                    category: form.category,
                    price: form.price,
                    cost: form.cost || undefined,
                    stock: form.stock,
                    requiresPrescription: form.requiresPrescription,
                  });
                }}
                disabled={createProduct.isPending}
                className="flex-1 h-11 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white gap-2 font-bold shadow-lg shadow-purple-500/20"
              >
                <Save className="w-4 h-4" />
                {createProduct.isPending ? "Guardando..." : "Guardar producto"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)} className="border-slate-600 text-slate-200 hover:bg-slate-700">
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {productsQuery.isLoading ? (
        <div className="text-center py-16">
          <div className="inline-block w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
          <p className="text-slate-300 mt-4 font-medium">Cargando productos...</p>
        </div>
      ) : products.length === 0 ? (
        <Card className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-slate-700/80 border-dashed">
          <CardContent className="pt-14 pb-14 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Package className="w-10 h-10 text-purple-400" />
            </div>
            <p className="text-white font-bold text-lg mb-1">Aun no tienes productos</p>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              Agrega productos como medicamentos, alimentos, accesorios para venderlos en tu POS.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {products.map((p: any) => (
            <Card
              key={p.id}
              className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 border-slate-700/80 hover:border-purple-500/50 transition-all"
            >
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge className={categoryColors[p.category] + " capitalize text-xs font-bold border"}>
                        {p.category}
                      </Badge>
                      {p.requiresPrescription && (
                        <Badge className="bg-rose-500/20 text-rose-200 border-rose-500/40 text-xs font-bold border">
                          Receta
                        </Badge>
                      )}
                      {p.stock <= 0 && (
                        <Badge className="bg-slate-700 text-slate-300 border-slate-600 text-xs font-bold border">
                          Agotado
                        </Badge>
                      )}
                    </div>
                    <p className="font-bold text-white text-base truncate">{p.name}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-2xl font-bold text-purple-300 tracking-tight">{formatMoney(p.price)}</span>
                      <span className="text-xs text-slate-400">Stock: <span className="font-bold text-slate-200">{p.stock}</span></span>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Eliminar este producto?")) deleteProduct.mutate({ id: p.id });
                    }}
                    className="text-rose-400 hover:bg-rose-500/20 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SERVICES TAB
// ============================================================================

function ServicesTab() {
  const utils = trpc.useUtils();
  const servicesQuery = trpc.veterinaria.services.list.useQuery({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "consulta" as const,
    price: "",
    durationMinutes: 30,
  });

  const createService = trpc.veterinaria.services.create.useMutation({
    onSuccess: () => {
      toast.success("Servicio creado correctamente");
      setShowForm(false);
      setForm({ name: "", category: "consulta", price: "", durationMinutes: 30 });
      utils.veterinaria.services.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteService = trpc.veterinaria.services.delete.useMutation({
    onSuccess: () => {
      toast.success("Servicio eliminado");
      utils.veterinaria.services.list.invalidate();
    },
  });

  const services = servicesQuery.data ?? [];

  const categoryColors: Record<string, string> = {
    consulta: "bg-blue-500/20 text-blue-200 border-blue-500/40",
    vacuna: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
    desparasitacion: "bg-cyan-500/20 text-cyan-200 border-cyan-500/40",
    estetica: "bg-pink-500/20 text-pink-200 border-pink-500/40",
    cirugia: "bg-rose-500/20 text-rose-200 border-rose-500/40",
    hospitalizacion: "bg-amber-500/20 text-amber-200 border-amber-500/40",
    domicilio: "bg-purple-500/20 text-purple-200 border-purple-500/40",
    otro: "bg-slate-500/20 text-slate-200 border-slate-500/40",
  };

  const categoryEmoji: Record<string, string> = {
    consulta: "🩺",
    vacuna: "💉",
    desparasitacion: "🧪",
    estetica: "✂️",
    cirugia: "⚕️",
    hospitalizacion: "🏥",
    domicilio: "🏠",
    otro: "📋",
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white gap-2 font-bold shadow-lg shadow-emerald-500/20 h-11 px-5"
        >
          <Plus className="w-4 h-4" /> Nuevo servicio
        </Button>
      </div>

      {showForm && (
        <Card className="bg-gradient-to-br from-emerald-950/60 via-slate-900 to-cyan-950/60 border-emerald-500/40 shadow-2xl shadow-emerald-500/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-emerald-300" />
              </div>
              Nuevo servicio
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)} className="text-slate-300 hover:text-white">
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5 block">
                Nombre del servicio <span className="text-rose-400">*</span>
              </label>
              <Input
                placeholder="Ej. Consulta general"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-slate-900 border-slate-700 text-white h-11"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5 block">Categoria</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white h-11 font-medium"
              >
                <option value="consulta">🩺 Consulta</option>
                <option value="vacuna">💉 Vacuna</option>
                <option value="desparasitacion">🧪 Desparasitacion</option>
                <option value="estetica">✂️ Estetica</option>
                <option value="cirugia">⚕️ Cirugia</option>
                <option value="hospitalizacion">🏥 Hospitalizacion</option>
                <option value="domicilio">🏠 Domicilio</option>
                <option value="otro">📋 Otro</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5 block">
                  Precio <span className="text-rose-400">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="300.00"
                  className="bg-slate-900 border-slate-700 text-white h-11"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5 block">Duracion (min)</label>
                <Input
                  type="number"
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                  className="bg-slate-900 border-slate-700 text-white h-11"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => {
                  if (!form.name || !form.price) return toast.error("Nombre y precio son obligatorios");
                  createService.mutate(form);
                }}
                disabled={createService.isPending}
                className="flex-1 h-11 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white gap-2 font-bold shadow-lg shadow-emerald-500/20"
              >
                <Save className="w-4 h-4" />
                {createService.isPending ? "Guardando..." : "Guardar servicio"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)} className="border-slate-600 text-slate-200 hover:bg-slate-700">
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {servicesQuery.isLoading ? (
        <div className="text-center py-16">
          <div className="inline-block w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-slate-300 mt-4 font-medium">Cargando servicios...</p>
        </div>
      ) : services.length === 0 ? (
        <Card className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-slate-700/80 border-dashed">
          <CardContent className="pt-14 pb-14 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Wrench className="w-10 h-10 text-emerald-400" />
            </div>
            <p className="text-white font-bold text-lg mb-1">Aun no tienes servicios</p>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              Agrega los servicios que ofreces (consulta, vacunas, esteticos) para venderlos en tu POS.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {services.map((s: any) => (
            <Card
              key={s.id}
              className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 border-slate-700/80 hover:border-emerald-500/50 transition-all"
            >
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="text-3xl flex-shrink-0">{categoryEmoji[s.category] || "📋"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <Badge className={categoryColors[s.category] + " capitalize text-xs font-bold border"}>
                          {s.category}
                        </Badge>
                        <span className="text-xs text-slate-400 font-medium">
                          {s.durationMinutes} min
                        </span>
                      </div>
                      <p className="font-bold text-white text-base truncate">{s.name}</p>
                      <p className="text-2xl font-bold text-emerald-300 tracking-tight mt-1">{formatMoney(s.price)}</p>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Eliminar este servicio?")) deleteService.mutate({ id: s.id });
                    }}
                    className="text-rose-400 hover:bg-rose-500/20 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SETTINGS TAB
// ============================================================================

function SettingsTab() {
  const utils = trpc.useUtils();
  const settingsQuery = trpc.veterinaria.settings.get.useQuery();

  const [form, setForm] = useState({
    clinicName: "",
    doctorName: "",
    professionalLicense: "",
    university: "",
    phone: "",
    email: "",
    address: "",
    rfc: "",
    receiptFooter: "",
  });

  // Cargar datos cuando lleguen del backend
  useEffect(() => {
    if (settingsQuery.data) {
      setForm({
        clinicName: settingsQuery.data.clinicName ?? "",
        doctorName: settingsQuery.data.doctorName ?? "",
        professionalLicense: settingsQuery.data.professionalLicense ?? "",
        university: settingsQuery.data.university ?? "",
        phone: settingsQuery.data.phone ?? "",
        email: settingsQuery.data.email ?? "",
        address: settingsQuery.data.address ?? "",
        rfc: settingsQuery.data.rfc ?? "",
        receiptFooter: settingsQuery.data.receiptFooter ?? "",
      });
    }
  }, [settingsQuery.data]);

  const upsertSettings = trpc.veterinaria.settings.upsert.useMutation({
    onSuccess: () => {
      toast.success("Configuracion guardada correctamente");
      utils.veterinaria.settings.get.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const isComplete = form.clinicName && form.doctorName && form.professionalLicense;

  return (
    <div className="max-w-4xl space-y-5">
      {/* Card de estado */}
      <Card className={
        isComplete
          ? "bg-gradient-to-br from-emerald-900/40 to-cyan-900/40 border-emerald-500/40 shadow-xl shadow-emerald-500/10"
          : "bg-gradient-to-br from-amber-900/30 to-orange-900/30 border-amber-500/40 shadow-xl shadow-amber-500/10"
      }>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-3">
            <div className={
              "w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 " +
              (isComplete ? "bg-emerald-500/30" : "bg-amber-500/30")
            }>
              {isComplete
                ? <CheckCircle2 className="w-6 h-6 text-emerald-200" />
                : <AlertTriangle className="w-6 h-6 text-amber-200" />
              }
            </div>
            <div className="flex-1">
              <p className="font-bold text-white text-base">
                {isComplete ? "Tu clinica esta configurada" : "Configuracion incompleta"}
              </p>
              <p className={"text-sm mt-0.5 " + (isComplete ? "text-emerald-200/80" : "text-amber-200/80")}>
                {isComplete
                  ? "Estos datos apareceran en los recibos de venta de tu clinica."
                  : "Llena los campos marcados con * para que tus recibos salgan completos."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Datos de la clinica */}
      <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 border-slate-700/80 shadow-xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-emerald-300" />
            </div>
            Datos de la clinica
          </CardTitle>
          <CardDescription className="text-slate-300">
            Informacion basica que aparecera en encabezado de recibos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5 block">
              Nombre de la clinica <span className="text-rose-400">*</span>
            </label>
            <Input
              value={form.clinicName}
              onChange={(e) => setForm({ ...form, clinicName: e.target.value })}
              placeholder="Ej. Veterinaria San Francisco"
              className="bg-slate-900 border-slate-700 text-white h-11"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5 block">
                Doctor (a) <span className="text-rose-400">*</span>
              </label>
              <Input
                value={form.doctorName}
                onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
                placeholder="MVZ Juan Perez"
                className="bg-slate-900 border-slate-700 text-white h-11"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5 block">
                Cedula profesional <span className="text-rose-400">*</span>
              </label>
              <Input
                value={form.professionalLicense}
                onChange={(e) => setForm({ ...form, professionalLicense: e.target.value })}
                placeholder="12345678"
                className="bg-slate-900 border-slate-700 text-white h-11"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5 block">Universidad</label>
            <Input
              value={form.university}
              onChange={(e) => setForm({ ...form, university: e.target.value })}
              placeholder="Universidad Nacional Autonoma de Mexico"
              className="bg-slate-900 border-slate-700 text-white h-11"
            />
          </div>
        </CardContent>
      </Card>

      {/* Datos de contacto */}
      <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 border-slate-700/80 shadow-xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Phone className="w-5 h-5 text-cyan-300" />
            </div>
            Contacto
          </CardTitle>
          <CardDescription className="text-slate-300">
            Como te pueden contactar tus clientes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-cyan-200 uppercase tracking-wider mb-1.5 block">Telefono</label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="555 123 4567"
                className="bg-slate-900 border-slate-700 text-white h-11"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-cyan-200 uppercase tracking-wider mb-1.5 block">Email</label>
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="contacto@clinica.com"
                className="bg-slate-900 border-slate-700 text-white h-11"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-cyan-200 uppercase tracking-wider mb-1.5 block">Direccion</label>
            <Textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Calle, numero, colonia, ciudad, codigo postal"
              rows={2}
              className="bg-slate-900 border-slate-700 text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Datos fiscales y recibo */}
      <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 border-slate-700/80 shadow-xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-300" />
            </div>
            Recibos y facturacion
          </CardTitle>
          <CardDescription className="text-slate-300">
            Personaliza la apariencia de tus recibos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-1.5 block">RFC (opcional)</label>
            <Input
              value={form.rfc}
              onChange={(e) => setForm({ ...form, rfc: e.target.value })}
              placeholder="RFC123456ABC"
              className="bg-slate-900 border-slate-700 text-white h-11"
            />
            <p className="text-xs text-slate-400 mt-1.5">Solo si emites facturas formales.</p>
          </div>
          <div>
            <label className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-1.5 block">Pie de recibo</label>
            <Textarea
              value={form.receiptFooter}
              onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
              placeholder="Ej. Gracias por confiar en nosotros para el cuidado de tu mascota."
              rows={2}
              className="bg-slate-900 border-slate-700 text-white"
            />
            <p className="text-xs text-slate-400 mt-1.5">Mensaje que aparecera al final de cada recibo.</p>
          </div>
        </CardContent>
      </Card>

      {/* Botón guardar */}
      <div className="sticky bottom-4 z-10">
        <Button
          onClick={() => upsertSettings.mutate(form)}
          disabled={upsertSettings.isPending}
          className="w-full h-12 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white gap-2 font-bold shadow-2xl shadow-emerald-500/30 text-base"
        >
          <Save className="w-5 h-5" />
          {upsertSettings.isPending ? "Guardando configuracion..." : "Guardar configuracion"}
        </Button>
      </div>
    </div>
  );
}
