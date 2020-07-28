/** Class implementing triangle surface mesh. */
class TriMesh{   
/** Initialize members of a TriMesh object */
    constructor(){
        this.isLoaded = false;
        this.minXYZ=[0,0,0];
        this.maxXYZ=[0,0,0];
        this.numFaces=0;
        this.numVertices=0;
        // Allocate vertex array
        this.vertexBuffer = [];
        // Allocate triangle array
        this.faceBuffer = [];
        // Allocate normal array
        this.normalBuffer = [];
        // Allocate array for edges so we can draw wireframe
        this.edgeBuffer = [];
        // Allocate  array for texture coordinates
        this.texcoordBuffer = [];
        console.log("TriMesh: Allocated buffers");
        // Get extension for 4 byte integer indices for drawElements
        var ext = gl.getExtension('OES_element_index_uint');
        if (ext ==null){
            alert("OES_element_index_uint is unsupported by your browser and terrain generation cannot proceed.")
        }
        else{ console.log("OES_element_index_uint is supported!")}
    }
    
    /**
    * Return if the JS arrays have been populated with mesh data
    */
    loaded(){ 
        return this.isLoaded
    }
   
    /**
    * Find a box defined by min and max XYZ coordinates
    */
    computeAABB(){
        for (let i = 0; i < this.vertexBuffer.length; i+=3) {
            let x = i, y = i+1, z = i+2
            if(this.vertexBuffer[x] > this.maxXYZ[0]){ this.maxXYZ[0] = this.vertexBuffer[x] }
            if(this.vertexBuffer[x] < this.minXYZ[0]){ this.minXYZ[0] = this.vertexBuffer[x] }

            if(this.vertexBuffer[y] > this.maxXYZ[1]){ this.maxXYZ[1] = this.vertexBuffer[y] }
            if(this.vertexBuffer[y] < this.minXYZ[1]){ this.minXYZ[1] = this.vertexBuffer[y] }

            if(this.vertexBuffer[z] > this.maxXYZ[2]){ this.maxXYZ[2] = this.vertexBuffer[z] }
            if(this.vertexBuffer[z] < this.minXYZ[2]){ this.minXYZ[2] = this.vertexBuffer[z] }
        }
    }
    
    /**
    * Return an axis-aligned bounding box
    * @param {Object} an array object of length 3 to fill win min XYZ coords
    * @param {Object} an array object of length 3 to fill win max XYZ coords
    */
   getAABB(Min,Max){
    Min = this.minXYZ
    Max = this.maxXYZ
}
    
    /**
    * Populate the JS arrays by parsing a string containing an OBJ file
    * @param {string} text of an OBJ file
    */
    loadFromOBJ(fileText)
    {   let Line = fileText.split('\n')
        Line.forEach(line => {
            let bit = line.split(/\b\s+(?!$)/)
            if(bit[0] == 'v'){
                this.vertexBuffer.push(parseFloat(bit[1]),parseFloat(bit[2]),parseFloat(bit[3]))
                this.numVertices +=1}
            if(bit[0] == 'f'){
                this.faceBuffer.push(parseInt(bit[1]-1),parseInt(bit[2]-1),parseInt(bit[3]-1))
                this.numFaces += 1}
        });
        console.log("TriMesh: Loaded ", this.numFaces, " triangles.");
        console.log("TriMesh: Loaded ", this.numVertices, " vertices.");
        this.generateNormals();
        console.log("TriMesh: Generated normals");
        this.generateLines();
        console.log("TriMesh: Generated lines");
        myMesh.loadBuffers();
        this.isLoaded = true;
    }
    
    /**
    * Send the buffer objects to WebGL for rendering 
    */
    loadBuffers()
    {
        // Specify the vertex coordinates
        this.VertexPositionormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionormalBuffer);      
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertexBuffer), gl.STATIC_DRAW);
        this.VertexPositionormalBuffer.itemSize = 3;
        this.VertexPositionormalBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexPositionormalBuffer.numItems, " vertices");
    
        // Specify normals to be able to do lighting calculations
        this.VertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normalBuffer), gl.STATIC_DRAW);
        this.VertexNormalBuffer.itemSize = 3;
        this.VertexNormalBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexNormalBuffer.numItems, " normals");
    
        // Specify faces of the terrain 
        this.IndexTriBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.faceBuffer), gl.STATIC_DRAW);
        this.IndexTriBuffer.itemSize = 1;
        this.IndexTriBuffer.numItems = this.faceBuffer.length;
        console.log("Loaded ", this.IndexTriBuffer.numItems/3, " triangles");
    
        //Setup Edges  
        this.IndexEdgeBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.edgeBuffer), gl.STATIC_DRAW);
        this.IndexEdgeBuffer.itemSize = 1;
        this.IndexEdgeBuffer.numItems = this.edgeBuffer.length;
    }
    
    /**
    * Render the triangles 
    */
    drawTriangles(){
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionormalBuffer.itemSize, 
                                gl.FLOAT, false, 0, 0)
        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, this.VertexNormalBuffer.itemSize, 
                                gl.FLOAT, false, 0, 0)   
        //Draw 
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.drawElements(gl.TRIANGLES, this.IndexTriBuffer.numItems, gl.UNSIGNED_INT,0)
    }
    
    /**
    * Render the triangle edges wireframe style 
    */
    drawEdges(){
    
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionormalBuffer)
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionormalBuffer.itemSize, gl.FLOAT, false, 0, 0)

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer)
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, this.VertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0)
    
        //Draw 
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer)
        gl.drawElements(gl.LINES, this.IndexEdgeBuffer.numItems, gl.UNSIGNED_INT,0);  
    }


/**
 * Print vertices and triangles to console for debugging
 */
printBuffers(){
     for(var i=0;i<this.numVertices;i++){
        console.log("v ", this.vertexBuffer[i*3], " ", this.vertexBuffer[i*3 + 1], " ", this.vertexBuffer[i*3 + 2], " ")
        }
    
     for(var i=0;i<this.numFaces;i++){
           console.log("f ", this.faceBuffer[i*3], " ", this.faceBuffer[i*3 + 1], " ", this.faceBuffer[i*3 + 2], " ");      
        }
    }

/**
 * Generates line values from faces in faceArray
 * to enable wireframe rendering
 */
generateLines(){
    var numTris=this.faceBuffer.length/3;
    for(var f=0;f<numTris;f++){
        var fid=f*3;
        this.edgeBuffer.push(this.faceBuffer[fid], this.faceBuffer[fid+1], this.faceBuffer[fid+1], this.faceBuffer[fid+2],
            this.faceBuffer[fid+2],this.faceBuffer[fid] )
        }
}
    
    
/**
* Set the x,y,z coords of a vertex at location id
* @param {number} the index of the vertex to set 
* @param {number} x coordinate
* @param {number} y coordinate
* @param {number} z coordinate
*/
setVertex(id,x,y,z){
    var vid = 3*id;
    this.vertexBuffer[vid]=x;
    this.vertexBuffer[vid+1]=y;
    this.vertexBuffer[vid+2]=z;
}

/**
* Return the x,y,z coords of a vertex at location id
* @param {number} the index of the vertex to return
* @param {Object} a length 3 array to populate withx,y,z coords
*/    
getVertex(id, v){
    var vid = 3*id;
    v[0] = this.vertexBuffer[vid];
    v[1] = this.vertexBuffer[vid+1];
    v[2] = this.vertexBuffer[vid+2];
}

/**
* Compute per-vertex normals for a mesh
*/   
generateNormals(){
    //per vertex normals
    this.numNormals = this.numVertices;
    this.normalBuffer = new Array(this.numNormals*3);
    
    for(var i=0;i<this.normalBuffer.length;i++)
        { this.normalBuffer[i]=0 }
    
    for(var i=0;i<this.numFaces;i++)
        {
            // Get vertex coodinates
            var v1 = this.faceBuffer[3*i]; 
            var v1Vec = vec3.fromValues(this.vertexBuffer[3*v1], this.vertexBuffer[3*v1+1], this.vertexBuffer[3*v1+2]);
            var v2 = this.faceBuffer[3*i+1]; 
            var v2Vec = vec3.fromValues(this.vertexBuffer[3*v2], this.vertexBuffer[3*v2+1], this.vertexBuffer[3*v2+2]);
            var v3 = this.faceBuffer[3*i+2]; 
            var v3Vec = vec3.fromValues(this.vertexBuffer[3*v3], this.vertexBuffer[3*v3+1], this.vertexBuffer[3*v3+2]);
            
           // Create edge vectors
            var e1=vec3.create();
            vec3.subtract(e1,v2Vec,v1Vec);
            var e2=vec3.create();
            vec3.subtract(e2,v3Vec,v1Vec);
            
            // Compute  normal
            var n = vec3.fromValues(0,0,0);
            vec3.cross(n,e1,e2);
            
            // Accumulate
            for(var j=0;j<3;j++){
                this.normalBuffer[3*v1+j]+=n[j];
                this.normalBuffer[3*v2+j]+=n[j];
                this.normalBuffer[3*v3+j]+=n[j];
            }         
        }
    for(var i=0;i<this.numNormals;i++)
        { var n = vec3.fromValues(this.normalBuffer[3*i], this.normalBuffer[3*i+1], this.normalBuffer[3*i+2]);
            vec3.normalize(n,n);
            this.normalBuffer[3*i] = n[0];
            this.normalBuffer[3*i+1]=n[1];
            this.normalBuffer[3*i+2]=n[2];  
        }
}       
}
