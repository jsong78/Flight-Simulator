/**
* terrainModeling.js
* 
* This file includes functions which generate terrain
*/


/**
 * Iteratively generate terrain from numeric inputs
 * vertexArray will contain each terrain vertices x,y,z values
 * @param {number} n This is the number of triangles we want to create in one edge 
 * @param {number} minX minimum x value (-1)
 * @param {number} maxX maximum x value (1)
 * @param {number} minY minimum y value (-1)
 * @param {number} maxY maximum y value (1)
 * @param {array} vertexArray Array containing vertices
 * @param {array} faceArray Array containing faces
 * @param {array} normalArray Array containing normals of the face
 * @return {numT} number of faces
 */
function terrainFromIteration(n, minX,maxX,minY,maxY, vertexArray, faceArray,normalArray)
{
    
    //make terrian vertices form iteration
    var deltaX=(maxX-minX)/n;
    var deltaY=(maxY-minY)/n;
    for(var i=0;i<=n;i++)
       for(var j=0;j<=n;j++)
       {
           vertexArray.push(minX+deltaX*j);
           vertexArray.push(minY+deltaY*i);
           vertexArray.push(0.0);
           
           normalArray.push(0);
           normalArray.push(0);
           normalArray.push(0);
       }

    //make terrian faces from iteration
    var numT=0;
    for(var i=0;i<n;i++)
       for(var j=0;j<n;j++)
       {
           var vid = i*(n+1) + j;
           faceArray.push(vid);
           faceArray.push(vid+1);
           faceArray.push(vid+n+1);
           
           faceArray.push(vid+1);
           faceArray.push(vid+1+n+1);
           faceArray.push(vid+n+1);
           numT+=2 ;
       }
    
    //sets the terrian height (z value)
    set_height(vertexArray,n);

    //sets the normals of the new terrian
    normalArray = setNorms(faceArray, vertexArray, normalArray);

    return numT;
}

/**
 * set the outermost four corners of the terrain z value as 'half' value,
 * 128/2 = 64, in my case, when z is ranged from 0-128
 * divide function is called in this function, which implements the diamond-square algorithm
 * @param {array} vArray This is the array that contains vertices
 * @param {number} n This is the number of triangles we want to create in one edge
 * @return {none} 
 */
function set_height(vArray,n)
{
    half = n/2;
    // set the corners to half value
    //index: y*(n+1)*3 + x*3 +2
    vArray[0+2] = half;
    vArray[n*3+2] = half;
    vArray[n*(n+1)*3+2] = half;
    vArray[n*(n+1)*3+n*3+2] = half;
    
    // diamond-square algorithm
    divide(vArray,n,n);
    
    // after creating heights valued from 0-128 we make it back to range -1 to 1
    for(i=0; i<=n; i++)
    {
        for(j=0; j<=n; j++)
        {
            vArray[i*(n+1)*3+j*3+2] = vArray[i*(n+1)*3+j*3+2]/half-1;
        }
    } 
    
}

/** 
 * recursively implements the diamond-square algorithm
 * for every recursive fuction, size is halved
 * which means we divide the array into 4 sub-squares
 * @param {array} vArray Array containing vertices
 * @param {number} n This is the number of triangles we want to create in one edge
 * @param {number} size This is the recursive n that becomes halved every time
 * @return {none} 
 */
function divide(vArray,n,size)
{        
    // scale is determined by multiplying roughness factor
    // close to 0 for round terrain and close to 1 for mountainious/spiky terrain
    var scale = 0.28*size;
    var half = size/2;

    // base case
    if (half<1)
        return;
    
    // implement diamondstep
    for (var y=half; y<n; y+=size){
        for (var x=half; x<n; x+=size){
            Diamondstep(vArray,x,y,half,Math.random()*scale*2-scale,n);
        }
    }
    
    // implement squarestep
    for (y=0; y<=n; y+=half){
        for (x=(y+half)%size; x<=n; x+=size){
            Squarestep(vArray,x,y,half,Math.random()*scale*2-scale,n);
        }
    }
    divide(vArray,n,size/2);
}

/**
 * taking four corner z-values of a square, determine the middle point z-value
 * by averaging four values and adding randomized offset value
 * @param {array} vArray Array containing vertices
 * @param {number} x x value
 * @param {number} y y value
 * @param {number} size This is the recursive n that becomes halved every time
 * @param {number} offset This is the random height value 
 * @param {number} n This is the number of triangles we want to create in one edge
 * @return {none} 
 */
function Diamondstep(vArray,x,y,size,offset,n)
{
    // z index: y*(n+1)*3 + x*3 +2        
    var botleft = (y-size)*(n+1)*3 + (x-size)*3+2;
    var botright = (y-size)*(n+1)*3 + (x+size)*3+2;
    var topleft = (y+size)*(n+1)*3 + (x-size)*3+2;
    var topright = (y+size)*(n+1)*3 + (x+size)*3+2;
    
    var total_height = vArray[botleft]+vArray[botright]+vArray[topleft]+vArray[topright];
    var avg = total_height/4;
    vArray[y*(n+1)*3+x*3+2] = avg+offset;
}

/**
 * taking four corner z-values of a diamond, determine the middle point z-value
 * by averaging four values and adding randomized offset value
 * if we only have 3 corner points available, average just those three
 * @param {array} vArray Array containing vertices
 * @param {number} x x value
 * @param {number} y y value
 * @param {number} size This is the recursive n that becomes halved every time
 * @param {number} offset This is the random height value
 * @param {number} n This is the number of triangles we want to create in one edge
 * @return {none}
 */
function Squarestep(vArray,x,y,size,offset,n)
{
    // z index: y*(n+1)*3 + x*3 +2        
    var top = (y-size)*(n+1)*3 + x*3+2;
    var right = y*(n+1)*3 + (x+size)*3+2;
    var bottom = (y+size)*(n+1)*3 + x*3+2;
    var left = y*(n+1)*3 + (x-size)*3+2;

    if (y-size < 0)
    {    
        var total_height = vArray[right]+vArray[bottom]+vArray[left];
        var avg = total_height/3;
    }
    else if (x+size > n)
    {
        var total_height = vArray[top]+vArray[bottom]+vArray[left];
        var avg = total_height/3;
    }
    else if (y+size > n)
    {    
        var total_height = vArray[top]+vArray[right]+vArray[left];
        var avg = total_height/3;
    }
    else if (x-size < 0)
    {
        var total_height = vArray[top]+vArray[right]+vArray[bottom];
        var avg = total_height/3;
    }
    else
    {
        var total_height = vArray[top]+vArray[right]+vArray[bottom]+vArray[left];
        var avg = total_height/4;
    }

    vArray[y*(n+1)*3+x*3+2] = avg+offset;
}

/**
 * sets the normals of the new terrian
 * @param {array} faceArray Array containing faces
 * @param {array} vertexArray Array containing vertices
 * @param {array} normalArray Array that will contain normals of the face
 * @return {normalArray} Array containing normals of the face
 */
function setNorms(faceArray, vertexArray, normalArray)
{
    for(var i=0; i<faceArray.length;i+=3)
    {
        //find the face normal
        var vertex1 = vec3.fromValues(vertexArray[faceArray[i]*3],vertexArray[faceArray[i]*3+1],vertexArray[faceArray[i]*3+2]);
        
        var vertex2 = vec3.fromValues(vertexArray[faceArray[i+1]*3],vertexArray[faceArray[i+1]*3+1],vertexArray[faceArray[i+1]*3+2]);
        
        var vertex3 = vec3.fromValues(vertexArray[faceArray[i+2]*3],vertexArray[faceArray[i+2]*3+1],vertexArray[faceArray[i+2]*3+2]);
        
        var vect31=vec3.create(), vect21=vec3.create();
        vec3.sub(vect21,vertex2,vertex1);
        vec3.sub(vect31,vertex3,vertex1)
        var v=vec3.create();
        vec3.cross(v,vect21,vect31);
        
        //add the face normal to all the faces vertices
        normalArray[faceArray[i]*3  ]+=v[0];
        normalArray[faceArray[i]*3+1]+=v[1];
        normalArray[faceArray[i]*3+2]+=v[2];

        normalArray[faceArray[i+1]*3]+=v[0];
        normalArray[faceArray[i+1]*3+1]+=v[1];
        normalArray[faceArray[i+1]*3+2]+=v[2];

        normalArray[faceArray[i+2]*3]+=v[0];
        normalArray[faceArray[i+2]*3+1]+=v[1];
        normalArray[faceArray[i+2]*3+2]+=v[2];

    }
    
    //normalize each vertex normal
    for(var i=0; i<normalArray.length;i+=3)
    {
        var v = vec3.fromValues(normalArray[i],normalArray[i+1],normalArray[i+2]); 
        vec3.normalize(v,v);
        
        normalArray[i  ]=v[0];
        normalArray[i+1]=v[1];
        normalArray[i+2]=v[2];
    }
    
    //return the vertex normal
    return normalArray;
}


/**
 * Iteratively generate edge array from indexed triangles
 * @param {array} faceArray Array containing faces
 * @param {array} lineArray Array containing edges
 * @return {none}
 */function generateLinesFromIndexedTriangles(faceArray,lineArray)
{
    numTris=faceArray.length/3;
    for(var f=0;f<numTris;f++)
    {
        var fid=f*3;
        lineArray.push(faceArray[fid]);
        lineArray.push(faceArray[fid+1]);
        
        lineArray.push(faceArray[fid+1]);
        lineArray.push(faceArray[fid+2]);
        
        lineArray.push(faceArray[fid+2]);
        lineArray.push(faceArray[fid]);
    }
}


