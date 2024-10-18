<script lang="ts">
	import { T } from '@threlte/core';
	import { ContactShadows, Float, Grid, OrbitControls, GLTF } from '@threlte/extras';
</script>

<T.PerspectiveCamera makeDefault position={[-10, 10, 10]} fov={15}>
	<OrbitControls autoRotate enableZoom={false} enableDamping autoRotateSpeed={0.5} target.y={1.5} />
</T.PerspectiveCamera>
<T.Mesh position.y={0} position.z={0}>
	<GLTF url="/Monitor.glb" />
</T.Mesh>
